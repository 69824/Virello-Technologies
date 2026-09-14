/* =========================================================
   VIRELLO TECHNOLOGIES
   OPTIONAL SCHEME-OF-WORK FILE UPLOAD CONFIGURATION

   This uses Cloudinary unsigned browser uploads instead of
   Firebase Storage, so the Scheme of Work feature does not
   require Firebase Storage billing.

   Replace the two values below with your Cloudinary details.
   Never put your Cloudinary API Secret in this file.
========================================================= */

const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME";
const CLOUDINARY_UPLOAD_PRESET = "YOUR_UNSIGNED_UPLOAD_PRESET";

export {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_PRESET
};
