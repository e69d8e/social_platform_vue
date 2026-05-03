export default (count) => {
  if (count >= 1000 && count < 10000) {
    const qian = count / 1000;
    // 保留两位小数，避免过多小数位
    return `${qian.toFixed(1)} k`;
  } else if (count >= 10000) {
    const wan = count / 10000;
    // 保留两位小数，避免过多小数位
    return `${wan.toFixed(1)} w`;
  }
  return count.toString();
};
