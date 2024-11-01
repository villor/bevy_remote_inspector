export async function callBrp<TResult>(url: string, method: string, params?: any) {
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new FetchError(response);
  }

  const data = await response.json();

  if (data.error) {
    throw new BrpError(data.error);
  }

  return data.result as TResult;
}

export class FetchError extends Error {
  response: Response;

  constructor(response: Response) {
    super(response.statusText);
    this.name = 'FetchError';
    this.response = response;
  }
}

export class BrpError extends Error {
  code: number;
  data: any;

  constructor(errorData: any) {
    super(errorData?.message);
    this.name = 'BrpError';
    this.code = errorData?.code ?? -1;
    this.data = errorData?.data;
  }
}
