PRIVATE-ONLY WALLET CLEANUP

What this update does:
- Removes all old GitHub ticket links and buttons from the Wallet.
- Keeps map and meeting-point buttons.
- Shows only files privately uploaded beneath each reservation card.
- Removes the tickets folder from this deployment package.
- Clears the old service-worker cache that may still contain former public PDFs.

Your locally uploaded files are stored in IndexedDB under the same website address. Replacing these app files does not intentionally delete them. Keep the original PDFs in iCloud Drive or Files as a backup.

Upload all files in this package to the repository root and replace the existing versions. There is no tickets folder to upload.
