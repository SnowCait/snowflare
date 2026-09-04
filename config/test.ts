import defaultConfig from "./default";

export default {
  nip11: {
    ...defaultConfig.nip11,
    limitation: {
      ...defaultConfig.nip11.limitation,
      restricted_writes: false,
    },
  },
};
