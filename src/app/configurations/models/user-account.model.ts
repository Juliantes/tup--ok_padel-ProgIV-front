export interface UserAccountDetails {
  birthDate: string | null;
  address: string;
  phones: string[];
}

export const EMPTY_USER_ACCOUNT_DETAILS: UserAccountDetails = {
  birthDate: null,
  address: '',
  phones: [''],
};
