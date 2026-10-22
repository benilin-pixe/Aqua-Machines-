import { User, Admin } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      admin?: any;
    }
  }
}
