// import { model, Schema } from 'mongoose';
//
// const userSchema = new Schema({
//   username: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   password: {
//     type: String,
//     required: true,
//   },
// });
//
// export const User = model('User', userSchema);

import { model, Schema } from 'mongoose';

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // ── ADD THESE TWO ──────────────────────
  isEnrolled: {
    type: Boolean,
    default: false,
  },
  typingRounds: {
    type: Number,
    default: 0,
  },
  // ───────────────────────────────────────
});

export const User = model('User', userSchema);
