
export enum Sender {
  User = 'user',
  Model = 'model',
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  feedback?: 'liked';
}