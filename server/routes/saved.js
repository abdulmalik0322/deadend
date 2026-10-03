import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/saved.controller.js';

const router = Router();

router.use(protect);

router.get('/', c.listSaved); // ?folder=<folderId>
router.get('/folders', c.listFolders);
router.post('/folders', c.createFolder);
router.patch('/folders/:id', c.updateFolder);
router.delete('/folders/:id', c.deleteFolder);

export default router;
