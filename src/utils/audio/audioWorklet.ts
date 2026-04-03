
export const audioWorkletCode = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channel = input[0];
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.index++] = channel[i];
        if (this.index >= this.bufferSize) {
          // Send a copy of the buffer
          this.port.postMessage(this.buffer);
          this.index = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;
