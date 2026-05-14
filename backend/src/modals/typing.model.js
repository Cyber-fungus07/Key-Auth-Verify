import { model, Schema } from 'mongoose';

const keystrokeSchema = new Schema({
  word: { type: String, required: true },
  key: { type: String, required: true },
  keydown: { type: Number, required: true },
  keyup: { type: Number },
  holdTime: { type: Number },
});

const typingWordSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  data: [keystrokeSchema],
  timestamp: { type: Date, default: Date.now },
});

export const TypingWord = model('TypingWord', typingWordSchema);