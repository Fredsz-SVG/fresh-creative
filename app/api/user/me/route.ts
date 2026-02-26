import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get profile from public.users
    const { data, error } = await supabase
        .from('users')
        .select('credits, is_suspended')
        .eq('id', user.id)
        .maybeSingle()

    if (error || !data) {
        // User profile might not exist for older users if trigger wasn't there
        // Create basic profile if needed or return defaults
        return NextResponse.json({ id: user.id, credits: 0, isSuspended: false })
    }

    return NextResponse.json({
        id: user.id,
        credits: data?.credits ?? 0,
        isSuspended: data?.is_suspended ?? false,
    })
}
