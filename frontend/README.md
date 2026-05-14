# KeyAuth — Keystroke Authentication Frontend

React frontend fully wired to your Express + MongoDB backend.

## Folder Structure

```
keystroke-auth/
├── public/
│   └── index.html
└── src/
    ├── api/
    │   └── auth.js                   ← all API calls + token storage
    ├── components/
    │   └── TypingCaptcha.js          ← typing UI with live char highlighting
    ├── hooks/
    │   └── useKeystrokeCapture.js    ← records key, keydown, keyup, holdTime
    ├── pages/
    │   ├── LoginPage.js              ← login + 1 typing round
    │   ├── RegisterPage.js           ← register + 5 typing rounds
    │   └── ResultPage.js             ← success screen with user details
    ├── App.js
    └── index.js
```

## Quickstart

```bash
npm install
npm start
```

Make sure your Express server is running and set the right URL:

```js
// src/api/auth.js
export const BASE_URL = "http://localhost:5000"; // ← change this
```

## API endpoints used

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/auth/register` | — | `{ username, email, password }` |
| POST | `/api/auth/login` | — | `{ username, password }` |
| POST | `/api/protected/typing/submit` | Bearer JWT | `{ logs }` |

## Keystroke payload shape

Your backend's `TypingWord` schema expects:

```json
{
  "logs": [
    {
      "word": "The quick brown fox jumps over the lazy dog",
      "data": [
        { "key": "T", "keydown": 1700000000000, "keyup": 1700000000082, "holdTime": 82 },
        { "key": "h", "keydown": 1700000000095, "keyup": 1700000000171, "holdTime": 76 }
      ]
    }
  ]
}
```

- Register sends 5 items in `logs` (one per round)
- Login sends 1 item in `logs`

## Flow

```
Register:
  form (username + email + password)
    → 5× TypingCaptcha rounds
    → POST /api/auth/register  (get JWT)
    → POST /api/protected/typing/submit  (store 5 rounds)
    → ResultPage

Login:
  form (username + password)
    → 1× TypingCaptcha round
    → POST /api/auth/login  (get JWT)
    → POST /api/protected/typing/submit  (store 1 round)
    → ResultPage
```

JWT is stored in `localStorage` under `ka_token`. It is automatically attached to the typing submit call.
