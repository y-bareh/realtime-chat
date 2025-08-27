# Uploads Directory

This directory stores uploaded files, specifically images shared in conversations.

## Structure
- `images/` - Contains uploaded image files from chat messages

## Important Notes
- Files are stored with UUID names to prevent conflicts
- Maximum file size is 5MB
- Only image files (JPEG, PNG, GIF, WebP) are allowed
- Files are served statically by the Express server

## Security
- File type validation prevents malicious uploads
- Size limits prevent abuse
- UUID naming prevents enumeration attacks
