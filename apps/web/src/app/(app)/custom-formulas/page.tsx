import { redirect } from 'next/navigation';

export default function CustomFormulasRedirect() {
  redirect('/formulas?tab=custom');
}
