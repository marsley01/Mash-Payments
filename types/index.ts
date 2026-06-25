export interface DarajaConfigRow {
  id: string;
  consumer_key: string;
  consumer_secret: string;
  passkey: string;
  shortcode: string;
  environment: string;
  callback_url: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  phone: string;
  amount: number;
  reference: string | null;
  checkout_request_id: string | null;
  mpesa_receipt: string | null;
  status: string;
  created_at: string;
}

export interface STKPushRequest {
  phone: string;
  amount: number;
  reference: string;
}

export interface STKPushResponse {
  success: boolean;
  checkout_request_id?: string;
  message: string;
  error?: string;
}
