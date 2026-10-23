import { Hono } from 'hono';
import { wrap } from '../../http/express-adapter';
import {
  cancelDeletionController,
  changePasswordController,
  createAddressController,
  deleteAddressController,
  getPreferencesController,
  getProfileController,
  listAddressesController,
  patchAddressController,
  patchPreferencesController,
  patchProfileController,
  requestDeletionController,
} from './customer.controller';

// mounted at /api/v1/customer behind requireCustomer (see app.ts)
export const customerRouter = new Hono();

customerRouter.get('/me', wrap(getProfileController));
customerRouter.patch('/me', wrap(patchProfileController));

customerRouter.get('/me/preferences', wrap(getPreferencesController));
customerRouter.patch('/me/preferences', wrap(patchPreferencesController));

customerRouter.get('/me/addresses', wrap(listAddressesController));
customerRouter.post('/me/addresses', wrap(createAddressController));
customerRouter.patch('/me/addresses/:id', wrap(patchAddressController));
customerRouter.delete('/me/addresses/:id', wrap(deleteAddressController));

customerRouter.patch('/me/password', wrap(changePasswordController));

customerRouter.post('/me/deletion-request', wrap(requestDeletionController));
customerRouter.delete('/me/deletion-request', wrap(cancelDeletionController));
