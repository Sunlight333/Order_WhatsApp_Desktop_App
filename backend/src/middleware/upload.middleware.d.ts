import multer from 'multer';
export declare const uploadAvatar: multer.Multer;
export declare function getAvatarUrl(filename: string | null | undefined): string | null;
