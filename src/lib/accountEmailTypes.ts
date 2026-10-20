export interface AccountEmail {
  uid: string;
  email: string;
}

export interface AccountEmailSettings {
  accountUid: string;
  emails: AccountEmail[];
}
