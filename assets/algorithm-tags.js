// Filter taxonomy for the standalone Algorithm Index page.
// Three ML-knowledge axes only: paradigm, task, family.
// Course-organizational metadata (block / group) and exam meta (difficulty)
// are intentionally NOT filter dimensions — group is already the section
// header below, and difficulty shows up as the colored dot on each card.
//
// A topic with an empty array for a given dimension is treated as
// "not classified along this axis" — it always shows regardless of which
// chips are toggled in that dim. That keeps the foundation topics
// (probability / linear algebra / optimization) and pure-procedure topics
// (backpropagation) from being forced into stretched ML-model categories.
window.TOPIC_TAGS = {
  // Foundations — math prereqs, not ML paradigms / tasks / model families.
  "probability":         { paradigm: [],                task: [],                                family: ["probabilistic"] },
  "linear-algebra":      { paradigm: [],                task: [],                                family: ["linear"] },
  "optimization":        { paradigm: [],                task: [],                                family: [] },

  // Classical supervised
  "knn":                 { paradigm: ["supervised"],     task: ["classification"],                family: ["non-parametric", "classical"] },
  "naive-bayes":         { paradigm: ["supervised"],     task: ["classification"],                family: ["probabilistic", "classical"] },
  "linear-regression":   { paradigm: ["supervised"],     task: ["regression"],                    family: ["linear", "classical"] },
  "logistic-regression": { paradigm: ["supervised"],     task: ["classification"],                family: ["linear", "classical"] },
  "svm":                 { paradigm: ["supervised"],     task: ["classification"],                family: ["kernel", "classical"] },
  "kernel-methods":      { paradigm: ["supervised"],     task: ["classification", "regression"],  family: ["kernel", "classical"] },

  // Trees & ensembles
  "decision-trees":      { paradigm: ["supervised"],     task: ["classification", "regression"],  family: ["tree", "classical"] },
  "bagging":             { paradigm: ["supervised"],     task: ["classification", "regression"],  family: ["tree", "ensemble", "classical"] },
  "boosting":            { paradigm: ["supervised"],     task: ["classification", "regression"],  family: ["tree", "ensemble", "classical"] },

  // Unsupervised
  "pca":                 { paradigm: ["unsupervised"],   task: ["dim-reduction"],                 family: ["linear", "classical"] },
  "kmeans":              { paradigm: ["unsupervised"],   task: ["clustering"],                    family: ["classical"] },

  // Neural networks (training procedure, then architectures)
  "mlp":                 { paradigm: ["supervised"],     task: ["classification", "regression"],  family: ["deep", "neural"] },
  "backpropagation":     { paradigm: ["supervised"],     task: [],                                family: ["deep", "neural"] },
  "cnn":                 { paradigm: ["supervised"],     task: ["classification"],                family: ["deep", "neural"] },

  // Sequential
  "rnn":                 { paradigm: ["supervised"],     task: ["sequence"],                      family: ["deep", "neural"] },
  "lstm":                { paradigm: ["supervised"],     task: ["sequence"],                      family: ["deep", "neural"] },

  // Representation learning
  "autoencoder":         { paradigm: ["self-supervised"], task: ["dim-reduction", "representation"], family: ["deep", "neural"] },
  "vae":                 { paradigm: ["self-supervised"], task: ["generation", "representation"], family: ["deep", "neural", "probabilistic"] },
  "contrastive":         { paradigm: ["self-supervised"], task: ["representation"],               family: ["deep", "neural"] },

  // Modern sequence models
  "attention":           { paradigm: ["supervised"],     task: ["sequence"],                      family: ["deep", "neural"] },
  "positional-encoding": { paradigm: ["supervised"],     task: ["sequence"],                      family: ["deep", "neural"] },
  "transformer":         { paradigm: ["supervised"],     task: ["sequence"],                      family: ["deep", "neural"] },
  "llm":                 { paradigm: ["self-supervised"], task: ["sequence", "generation"],       family: ["deep", "neural"] },

  // Generative
  "diffusion":           { paradigm: ["self-supervised"], task: ["generation"],                   family: ["deep", "neural", "probabilistic"] },

  // Learning theory — analysis of supervised learning, no model family.
  "bayes-classifier":    { paradigm: ["theory"],         task: ["theoretical-bound"],             family: [] },
  "error-decomposition": { paradigm: ["theory"],         task: ["theoretical-bound"],             family: [] },
  "pac":                 { paradigm: ["theory"],         task: ["theoretical-bound"],             family: [] },
  "vc-dimension":        { paradigm: ["theory"],         task: ["theoretical-bound"],             family: [] },

  // Reinforcement learning
  "mdp":                 { paradigm: ["reinforcement"],  task: ["decision"],                      family: ["rl"] },
  "value-functions":     { paradigm: ["reinforcement"],  task: ["decision"],                      family: ["rl"] },
  "bellman":             { paradigm: ["reinforcement"],  task: ["decision"],                      family: ["rl"] },
  "dynamic-programming": { paradigm: ["reinforcement"],  task: ["decision"],                      family: ["rl"] },
  "q-learning":          { paradigm: ["reinforcement"],  task: ["decision"],                      family: ["rl"] },
  "policy-gradient":     { paradigm: ["reinforcement"],  task: ["decision"],                      family: ["rl"] },
};

// Three ML-knowledge dimensions. Each chip's count is computed at runtime
// from how many topics carry that value.
window.TAG_DIMENSIONS = [
  {
    id: "paradigm",
    label: { en: "🧭 Learning paradigm", cn: "🧭 学习范式" },
    values: ["supervised", "unsupervised", "self-supervised", "reinforcement", "theory"],
    valueLabels: {
      supervised:        { en: "Supervised",        cn: "监督" },
      unsupervised:      { en: "Unsupervised",      cn: "无监督" },
      "self-supervised": { en: "Self-supervised",   cn: "自监督" },
      reinforcement:     { en: "Reinforcement",     cn: "强化学习" },
      theory:            { en: "Theory",            cn: "学习理论" },
    },
  },
  {
    id: "task",
    label: { en: "🎬 Task", cn: "🎬 任务类型" },
    values: ["classification", "regression", "clustering", "dim-reduction", "representation", "sequence", "generation", "decision", "theoretical-bound"],
    valueLabels: {
      classification:    { en: "Classification",    cn: "分类" },
      regression:        { en: "Regression",        cn: "回归" },
      clustering:        { en: "Clustering",        cn: "聚类" },
      "dim-reduction":   { en: "Dim. reduction",    cn: "降维" },
      representation:    { en: "Representation",    cn: "表示学习" },
      sequence:          { en: "Sequence model",    cn: "序列建模" },
      generation:        { en: "Generation",        cn: "生成" },
      decision:          { en: "Decision making",   cn: "决策" },
      "theoretical-bound": { en: "Theoretical bound", cn: "理论界" },
    },
  },
  {
    id: "family",
    label: { en: "🧬 Model family", cn: "🧬 模型族" },
    values: ["classical", "linear", "non-parametric", "probabilistic", "kernel", "tree", "ensemble", "neural", "deep", "rl"],
    valueLabels: {
      classical:        { en: "Classical ML",      cn: "经典 ML" },
      linear:           { en: "Linear",            cn: "线性" },
      "non-parametric": { en: "Non-parametric",    cn: "非参数" },
      probabilistic:    { en: "Probabilistic",     cn: "概率" },
      kernel:           { en: "Kernel",            cn: "核方法" },
      tree:             { en: "Tree-based",        cn: "决策树" },
      ensemble:         { en: "Ensemble",          cn: "集成" },
      neural:           { en: "Neural",            cn: "神经网络" },
      deep:             { en: "Deep",              cn: "深度" },
      rl:               { en: "RL",                cn: "RL" },
    },
  },
];
