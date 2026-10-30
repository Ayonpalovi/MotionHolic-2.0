# Motionholic admin panel

Edit the website at **https://www.motionholic.com/admin** (no code needed).

## How it works
- All editable text, prices, links and image paths live in `motionholic-site/content/content.json`.
- `motionholic-site/api/_lib/template.html` is the page layout with `{{placeholders}}`;
  `api/_lib/render.js` fills them in.
- Pressing **Publish changes** in the admin makes ONE commit to `main` containing the new
  `content.json`, the regenerated `index.html` and any new images (`assets/uploads/`).
  Vercel then deploys it (about 30 seconds). "Past versions" is the git history of `content.json`.
- `index.html` is a GENERATED file. Change text via the admin; change layout in `template.html`.
  Edits made directly to `index.html` are overwritten at the next publish.

## Vercel environment variables (Production)
| Name | What |
| --- | --- |
| `ADMIN_PASSWORD` | the sign-in password (10+ characters, make it long) |
| `SESSION_SECRET` | random text, 24+ characters (signs the login cookie) |
| `GITHUB_TOKEN` | fine-grained GitHub token, repo `MotionHolic-2.0` only, permission **Contents: Read and write** |
| `GITHUB_REPO`, `GITHUB_BRANCH`, `SITE_DIR` | optional; default `Ayonpalovi/MotionHolic-2.0`, `main`, `motionholic-site` |

Changing `ADMIN_PASSWORD` signs everyone out. Revoking the GitHub token switches publishing off.

## Undo
Admin -> Past versions -> Restore. Or `git revert` the "Admin: ..." commit.

## Testing without touching anything real
```
node tools/test-admin.js     # 24 checks against a pretend GitHub
node tools/dev-server.js     # admin on http://localhost:5270/admin/ (password dev-password-123)
```
