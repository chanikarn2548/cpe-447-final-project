const GELU_SQRT_2_OVER_PI = Math.sqrt(2 / Math.PI);

function hasFiniteArray(value, length) {
  return Array.isArray(value) && value.length === length && value.every(Number.isFinite);
}

/** Validate a linear or residual-MLP classifier head against expected dimensions and class count. */
export function isValidClassifierHead(head, dimensions, classCount) {
  if (!head || head.dimensions !== dimensions || !Array.isArray(head.labels) || head.labels.length !== classCount) {
    return false;
  }
  if (new Set(head.labels).size !== classCount) return false;
  if (head.arch === 'residual-mlp-v1') {
    const h = head.hiddenDim;
    if (!Number.isInteger(h) || h <= 0 || !Array.isArray(head.members) || head.members.length === 0) return false;
    return head.members.every((m) =>
      m
      && hasFiniteArray(m.fc1Weight, h * dimensions)
      && hasFiniteArray(m.fc1Bias, h)
      && hasFiniteArray(m.lnWeight, h)
      && hasFiniteArray(m.lnBias, h)
      && hasFiniteArray(m.fc2Weight, classCount * h)
      && hasFiniteArray(m.fc2Bias, classCount)
      && hasFiniteArray(m.skipWeight, classCount * dimensions)
      && hasFiniteArray(m.skipBias, classCount)
    );
  }
  return hasFiniteArray(head.weights, classCount * (dimensions + 1));
}

function scoreLinearMember(vector, weights, dimensions, classCount) {
  const scores = new Array(classCount);
  const stride = dimensions + 1;
  for (let c = 0; c < classCount; c++) {
    let sum = weights[c * stride + dimensions];
    const offset = c * stride;
    for (let d = 0; d < dimensions; d++) sum += vector[d] * weights[offset + d];
    scores[c] = sum;
  }
  return scores;
}

function scoreResidualMlpMember(vector, member, dimensions, hiddenDim, classCount, normEps) {
  const h1 = new Float64Array(hiddenDim);
  let mean = 0;
  for (let h = 0; h < hiddenDim; h++) {
    let sum = member.fc1Bias[h];
    const off = h * dimensions;
    for (let d = 0; d < dimensions; d++) sum += vector[d] * member.fc1Weight[off + d];
    h1[h] = sum;
    mean += sum;
  }
  mean /= hiddenDim;
  let variance = 0;
  for (let h = 0; h < hiddenDim; h++) {
    const diff = h1[h] - mean;
    variance += diff * diff;
  }
  const invStd = 1 / Math.sqrt(variance / hiddenDim + normEps);
  for (let h = 0; h < hiddenDim; h++) {
    const z = (h1[h] - mean) * invStd * member.lnWeight[h] + member.lnBias[h];
    h1[h] = 0.5 * z * (1 + Math.tanh(GELU_SQRT_2_OVER_PI * (z + 0.044715 * z * z * z)));
  }
  const scores = new Array(classCount);
  for (let c = 0; c < classCount; c++) {
    let sum = member.fc2Bias[c] + member.skipBias[c];
    const fc2Off = c * hiddenDim;
    const skipOff = c * dimensions;
    for (let h = 0; h < hiddenDim; h++) sum += h1[h] * member.fc2Weight[fc2Off + h];
    for (let d = 0; d < dimensions; d++) sum += vector[d] * member.skipWeight[skipOff + d];
    scores[c] = sum;
  }
  return scores;
}

/** Compute ensemble-averaged raw class logits for linear or residual-mlp-v1 heads. */
export function scoreClassifierLogits(vector, head) {
  const dimensions = head.dimensions;
  const classCount = head.labels.length;
  if (head.arch !== 'residual-mlp-v1') {
    return scoreLinearMember(vector, head.weights, dimensions, classCount);
  }
  const eps = Number.isFinite(head.normEps) ? head.normEps : 1e-5;
  const totals = new Array(classCount).fill(0);
  for (const member of head.members) {
    const memberScores = scoreResidualMlpMember(vector, member, dimensions, head.hiddenDim, classCount, eps);
    for (let c = 0; c < classCount; c++) totals[c] += memberScores[c];
  }
  const count = head.members.length;
  for (let c = 0; c < classCount; c++) totals[c] /= count;
  return totals;
}
