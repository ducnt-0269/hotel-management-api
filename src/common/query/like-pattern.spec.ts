import { escapeLikePattern } from './like-pattern.js';

describe('escapeLikePattern', () => {
  it('leaves ordinary text alone', () => {
    expect(escapeLikePattern('Nguyễn Văn An')).toBe('Nguyễn Văn An');
  });

  it('escapes each LIKE wildcard', () => {
    expect(escapeLikePattern('50%')).toBe('50\\%');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
  });

  it('escapes the escape character first, so it is never doubled up', () => {
    expect(escapeLikePattern('\\%')).toBe('\\\\\\%');
  });
});
