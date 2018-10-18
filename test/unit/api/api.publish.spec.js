/**
 * @prettier
 */
import { addVersion, uploadPackageTarball, removeTarball, unPublishPackage, publishPackage } from '../../../src/api/endpoint/api/publish';
import { HTTP_STATUS, API_ERROR } from '../../../src/lib/constants';

const REVISION_MOCK = '15-e53a77096b0ee33e';

describe('Publish endpoints - add a tag', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {
        version: '1.0.0',
        tag: 'tag',
        package: 'verdaccio',
      },
      body: '',
    };
    res = {
      status: jest.fn(),
    };

    next = jest.fn();
  });

  test('should add a version', done => {
    const storage = {
      addVersion: (packageName, version, body, tag, cb) => {
        expect(packageName).toEqual(req.params.package);
        expect(version).toEqual(req.params.version);
        expect(body).toEqual(req.body);
        expect(tag).toEqual(req.params.tag);
        cb();
        done();
      },
    };

    addVersion(storage)(req, res, next);

    expect(res.status).toHaveBeenLastCalledWith(HTTP_STATUS.CREATED);
    expect(next).toHaveBeenLastCalledWith({ ok: 'package published' });
  });

  test('when failed to add a version', done => {
    const storage = {
      addVersion: (packageName, version, body, tag, cb) => {
        const error = {
          message: 'failure',
        };
        cb(error);
        done();
      },
    };

    addVersion(storage)(req, res, next);

    expect(next).toHaveBeenLastCalledWith({ message: 'failure' });
  });
});

/**
 * upload package: '/:package/-/:filename/*'
 */
describe('Publish endpoints - upload package tarball', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {
        filename: 'verdaccio.gzip',
        package: 'verdaccio',
      },
      pipe: jest.fn(),
      on: jest.fn(),
    };
    res = { status: jest.fn(), report_error: jest.fn() };
    next = jest.fn();
  });

  test('should upload package tarball successfully', () => {
    const stream = {
      done: jest.fn(),
      abort: jest.fn(),
      on: jest.fn(() => (status, cb) => cb()),
    };
    const storage = {
      addTarball(packageName, filename) {
        expect(packageName).toEqual(req.params.package);
        expect(filename).toEqual(req.params.filename);
        return stream;
      },
    };

    uploadPackageTarball(storage)(req, res, next);
    expect(req.pipe).toHaveBeenCalled();
    expect(req.on).toHaveBeenCalled();
  });
});

/**
 * Delete tarball: '/:package/-/:filename/-rev/:revision'
 */
describe('Publish endpoints - delete tarball', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {
        filename: 'verdaccio.gzip',
        package: 'verdaccio',
        revision: REVISION_MOCK,
      },
    };
    res = { status: jest.fn() };
    next = jest.fn();
  });

  test('should delete tarball successfully', done => {
    const storage = {
      removeTarball(packageName, filename, revision, cb) {
        expect(packageName).toEqual(req.params.package);
        expect(filename).toEqual(req.params.filename);
        expect(revision).toEqual(req.params.revision);
        cb();
        done();
      },
    };

    removeTarball(storage)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    expect(next).toHaveBeenCalledWith({ ok: 'tarball removed' });
  });

  test('failed while deleting the tarball', done => {
    const error = {
      message: 'deletion failed',
    };
    const storage = {
      removeTarball(packageName, filename, revision, cb) {
        cb(error);
        done();
      },
    };

    removeTarball(storage)(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

/**
 * Un-publish package: '/:package/-rev/*'
 */
describe('Publish endpoints - un-publish package', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {
        package: 'verdaccio',
      },
    };
    res = { status: jest.fn() };
    next = jest.fn();
  });

  test('should un-publish package successfully', done => {
    const storage = {
      removePackage(packageName, cb) {
        expect(packageName).toEqual(req.params.package);
        cb();
        done();
      },
    };

    unPublishPackage(storage)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    expect(next).toHaveBeenCalledWith({ ok: 'package removed' });
  });

  test('un-publish failed', done => {
    const error = {
      message: 'un-publish failed',
    };
    const storage = {
      removePackage(packageName, cb) {
        cb(error);
        done();
      },
    };

    unPublishPackage(storage)(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

/**
 * Publish package: '/:package/:_rev?/:revision?'
 */
describe('Publish endpoints - publish package', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {
        name: 'verdaccio',
      },
      params: {
        package: 'verdaccio',
      },
    };
    res = { status: jest.fn() };
    next = jest.fn();
  });

  test('should change the existing package', () => {
    const storage = {
      changePackage: jest.fn(),
    };

    req.params._rev = REVISION_MOCK;

    publishPackage(storage)(req, res, next);
    expect(storage.changePackage).toMatchSnapshot();
  });

  test('should add a new package', () => {
    const storage = {
      addPackage: jest.fn(),
    };

    publishPackage(storage)(req, res, next);
    expect(storage.addPackage).toMatchSnapshot();
  });

  test('should throw an error while publishing package', () => {
    const storage = {
      addPackage() {
        throw new Error();
      },
    };
    publishPackage(storage)(req, res, next);
    expect(next).toHaveBeenCalledWith(new Error(API_ERROR.BAD_PACKAGE_DATA));
  });

  test('should throw an error for un-implemented star calls', () => {
    const storage = {};
    req.body._rev = REVISION_MOCK;
    req.body.users = {};
    publishPackage(storage)(req, res, next);
    expect(next).toHaveBeenCalledWith(new Error('npm star| un-star calls are not implemented'));
  });
});
