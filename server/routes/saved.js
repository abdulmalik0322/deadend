import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  folderNameValidator,
  folderIdParam,
  listSavedQueryValidator,
} from '../validators/saved.validator.js';
import * as c from '../controllers/saved.controller.js';

const router = Router();

router.use(protect);

router.get('/', listSavedQueryValidator, validate, c.listSaved); // ?folderId=&q=
router.get('/folders', c.listFolders);
router.post('/folders', folderNameValidator, validate, c.createFolder);
router.patch('/folders/:id', folderIdParam, folderNameValidator, validate, c.updateFolder);
router.delete('/folders/:id', folderIdParam, validate, c.deleteFolder);

export default router;
