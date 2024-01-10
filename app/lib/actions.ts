'use server'

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod'

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.'
    }),
    amount: z.coerce
      .number()
      .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.'
    }),
    date: z.string()
})

const CreateInvoice = FormSchema.omit({id: true})
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
}

export async function createInvoice(prevState: State, formData: FormData) {

    const validatedFields = CreateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
      date: new Date().toISOString().split('T')[0]
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }

    const invoice = validatedFields.data;
    invoice.amount = invoice.amount * 100;

    try {
      await sql`
		    INSERT INTO invoices (customer_id, amount, status, date)
		    VALUES (${invoice.customerId}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
      `;
    } catch (error) {
      return {
        message: 'Database Error: Failed to Create Invoice.',
      };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {

    try {
      await sql`DELETE FROM invoices WHERE id = ${id}`;
    } catch (error) {
      return {
        message: 'Database Error: Failed to Delete Invoice.',
      };
    }

    revalidatePath('/dashboard/invoices');
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {

  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const invoice = validatedFields.data
  
  invoice.amount = invoice.amount * 100;
  
  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${invoice.customerId}, amount = ${invoice.amount}, status = ${invoice.status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}