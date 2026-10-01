/** Wildcard matching without compiling untrusted patterns to backtracking regex. */
export function matchPattern(
  input: string,
  pattern: string,
  many = "*",
  one?: string,
  insensitive = false,
): boolean {
  if (insensitive) {
    input = input.toLowerCase();
    pattern = pattern.toLowerCase();
  }
  let i = 0,
    p = 0,
    star = -1,
    checkpoint = 0;
  while (i < input.length) {
    if (
      p < pattern.length &&
      pattern[p] !== many &&
      (pattern[p] === one || pattern[p] === input[i])
    ) {
      i++;
      p++;
    } else if (pattern[p] === many) {
      star = p++;
      checkpoint = i;
    } else if (star >= 0) {
      p = star + 1;
      i = ++checkpoint;
    } else return false;
  }
  while (pattern[p] === many) p++;
  return p === pattern.length;
}
