interface Props { message: string; error: boolean; }

export default function FormFeedback({ message, error }: Props) {
  if (!message) return null;
  return <p className={`${error ? 'restricted-box' : 'info-box'} mt-2`} role={error ? 'alert' : 'status'}>{message}</p>;
}
