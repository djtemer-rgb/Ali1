import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getJson, setJson } from '../../../upstash';

const PARENT_AUTH_KEY = 'aq:parent:auth';
const SESSION_SECRET = process.env.AQ_PARENT_SESSION_SECRET || 'default-secret-change-me';

interface ParentAuth {
  pin1Hash?: string;
  pin2Hash?: string;
  recoveryWordHash?: string;
  updatedAt?: string;
}

export async function GET() {
  try {
    const auth = await getJson(PARENT_AUTH_KEY) as ParentAuth || {};
    // Never return hashes to client
    return NextResponse.json({
      hasPin1: !!auth.pin1Hash,
      hasPin2: !!auth.pin2Hash,
      hasRecovery: !!auth.recoveryWordHash
    });
  } catch (error) {
    console.error('Error getting auth:', error);
    return NextResponse.json({ hasPin1: false, hasPin2: false, hasRecovery: false });
  }
}

export async function POST(request: Request) {
  try {
    const { pin, pinSlot } = await request.json();
    
    if (!pin || pin.length < 4) {
      return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
    }
    
    const auth = await getJson(PARENT_AUTH_KEY) as ParentAuth || {};
    
    // Hash the PIN
    const pinHash = await bcrypt.hash(pin, 10);
    
    if (pinSlot === 1 || !auth.pin1Hash) {
      auth.pin1Hash = pinHash;
    } else {
      auth.pin2Hash = pinHash;
    }
    
    auth.updatedAt = new Date().toISOString();
    await setJson(PARENT_AUTH_KEY, auth);
    
    return NextResponse.json({ success: true, message: 'PIN saved' });
  } catch (error) {
    console.error('Error saving PIN:', error);
    return NextResponse.json({ error: 'Failed to save PIN' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { recoveryWord } = await request.json();
    
    if (!recoveryWord || recoveryWord.length < 4) {
      return NextResponse.json({ error: 'Recovery word must be at least 4 characters' }, { status: 400 });
    }
    
    const auth = await getJson(PARENT_AUTH_KEY) as ParentAuth || {};
    auth.recoveryWordHash = await bcrypt.hash(recoveryWord, 10);
    auth.updatedAt = new Date().toISOString();
    
    await setJson(PARENT_AUTH_KEY, auth);
    
    return NextResponse.json({ success: true, message: 'Recovery word saved' });
  } catch (error) {
    console.error('Error saving recovery word:', error);
    return NextResponse.json({ error: 'Failed to save recovery word' }, { status: 500 });
  }
}
