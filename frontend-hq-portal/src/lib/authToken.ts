type AccessTokenProvider = () => Promise<string | null>;

let provider: AccessTokenProvider | null = null;

export const registerAccessTokenProvider = (nextProvider: AccessTokenProvider | null) => {
  provider = nextProvider;
};

export const getRegisteredAccessToken = async (): Promise<string | null> => {
  if (!provider) {
    return null;
  }

  return provider();
};
