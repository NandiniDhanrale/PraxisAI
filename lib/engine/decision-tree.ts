export async function runDecisionTree(_args: { plugin: string; query: string }): Promise<{
  decisionPath: Array<{ step: number; node: string; label: string; result: string }>;
}> {
  return {
    decisionPath: [{ step: 1, node: "start", label: "Start", result: "ok" }]
  };
}

