import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user images for the authenticated user only
    const { data, error } = await supabase
      .from('user_images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { original_url, processed_url, operation_type, file_name, file_size } = body

    // Validate required fields
    if (!original_url || !operation_type || !file_name || !file_size) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert image record for the authenticated user
    const { data, error } = await supabase
      .from('user_images')
      .insert({
        user_id: user.id,
        original_url,
        processed_url,
        operation_type,
        file_name,
        file_size
      })
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return NextResponse.json({ error: 'Failed to save image' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('id')

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 })
    }

    // First get the image to verify ownership and get file paths
    const { data: imageData, error: fetchError } = await supabase
      .from('user_images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !imageData) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('user_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
    }

    // Try to delete files from storage
    const filesToDelete = []
    
    if (imageData.original_url && imageData.original_url.includes('temp-images')) {
      const path = imageData.original_url.split('/temp-images/')[1]
      if (path) filesToDelete.push(path)
    }
    
    if (imageData.processed_url && imageData.processed_url.includes('temp-images')) {
      const path = imageData.processed_url.split('/temp-images/')[1]
      if (path) filesToDelete.push(path)
    }

    // Delete files from storage if any exist
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('temp-images')
        .remove(filesToDelete)
      
      if (storageError) {
        console.warn('Storage deletion error:', storageError)
      }
    }

    return NextResponse.json({ data: imageData })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}