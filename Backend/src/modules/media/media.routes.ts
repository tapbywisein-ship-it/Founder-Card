import { Router } from 'express';
import mediaController from './media.controller';
import { authenticate } from '@middlewares/authenticate';
import { uploadSingle } from '@middlewares/upload';

const router = Router();

router.use(authenticate);

router.post('/upload', uploadSingle('file'), mediaController.uploadFile.bind(mediaController));
router.delete('/:key', mediaController.deleteFile.bind(mediaController));
router.get('/url/:key', mediaController.getPublicUrl.bind(mediaController));

export default router;
