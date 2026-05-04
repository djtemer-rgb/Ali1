import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') || 'ali';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    
    const ledger = await getJson(`aq:star-ledger:${childId}`) || [];
    const limited = ledger.slice(-limit); // Get last N items
    
    // Calculate current balance
    const balance = limited.reduce((sum: number, item: any) => sum + item.amount, 0);
    
    return NextResponse.json({ balance, ledger: limited });
  } catch (error) {
    console.error('Error getting star ledger:', error);
    return NextResponse.json({ balance: 0, ledger: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, amount, source, sourceId, reason } = body;
    
    const ledger = await getJson(`aq:star-ledger:${childId}`) || [];
    
    const newItem = {
      id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      childId,
      date: new Date().toISOString().split('T')[0],
      amount,
      source,
      sourceId,
      reason,
      createdAt: new Date().toISOString()
    };
    
    ledger.push(newItem);
    await setJson(`aq:star-ledger:${childId}`, ledger);
    
    // Calculate new balance
    const balance = ledger.reduce((sum: number, item: any) => sum + item.amount, 0);
    
    return NextResponse.json({ balance, item: newItem });
  } catch (error) {
    console.error('Error adding star ledger item:', error);
    return NextResponse.json({ error: 'Failed to add ledger item' }, { status: 500 });
  }
}
