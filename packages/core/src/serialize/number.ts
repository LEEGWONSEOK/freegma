// 숫자 정규화 — 소수 둘째 자리 반올림 (spec §5 직렬화)
// 같은 디자인은 항상 같은 바이트로: 1.005 → 1.01, -0 → 0, 아주 작은 수 → 0

/**
 * 소수 둘째 자리에서 반올림(0.5는 0에서 먼 쪽으로).
 * `Math.round(n * 100) / 100`은 1.005 → 1이 되는 부동소수 오차가 있어
 * 지수 표기로 자리만 옮겨 계산한다.
 */
export function round2(n: number): number {
  if (!Number.isFinite(n)) {
    throw new RangeError(`직렬화할 수 없는 숫자: ${n}`);
  }
  const sign = n < 0 ? -1 : 1;
  const [mantissa = '0', exponent = '0'] = String(Math.abs(n)).split('e');
  const shifted = Math.round(Number(`${mantissa}e${Number(exponent) + 2}`));
  const rounded = sign * Number(`${shifted}e-2`);
  // -0 → 0
  return rounded === 0 ? 0 : rounded;
}
