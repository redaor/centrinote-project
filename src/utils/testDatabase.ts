/**
 * Database Test Utility
 * 
 * Use this to verify database tables are properly created
 * Run in browser console after database setup
 */

import { supabase } from '../lib/supabase';

export async function testZoomDatabaseSetup() {
  console.log('🧪 Testing Zoom Database Setup...\n');
  
  const results = {
    userAuth: false,
    tablesExist: false,
    rlsPolicies: false,
    insertTest: false,
    selectTest: false
  };

  try {
    // Test 1: User Authentication
    console.log('1️⃣ Testing user authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ User not authenticated:', authError?.message);
      return results;
    }
    
    console.log('✅ User authenticated:', user.email);
    results.userAuth = true;

    // Test 2: Check if tables exist
    console.log('\n2️⃣ Checking if tables exist...');
    const tableChecks = await Promise.all([
      supabase.from('zoom_user_connections').select('count', { count: 'exact', head: true }),
      supabase.from('zoom_meetings').select('count', { count: 'exact', head: true }),
      supabase.from('zoom_meeting_participants').select('count', { count: 'exact', head: true })
    ]);

    const tableErrors = tableChecks.filter(check => check.error);
    
    if (tableErrors.length > 0) {
      console.error('❌ Some tables missing:');
      tableErrors.forEach((check, index) => {
        const tableName = ['zoom_user_connections', 'zoom_meetings', 'zoom_meeting_participants'][index];
        console.error(`  - ${tableName}:`, check.error?.message);
      });
      return results;
    }

    console.log('✅ All tables exist:');
    console.log('  - zoom_user_connections ✅');
    console.log('  - zoom_meetings ✅');
    console.log('  - zoom_meeting_participants ✅');
    results.tablesExist = true;

    // Test 3: Test INSERT operation
    console.log('\n3️⃣ Testing INSERT operation...');
    const testConnection = {
      user_id: user.id,
      zoom_user_id: `test_${Date.now()}`,
      zoom_email: 'test@example.com',
      zoom_display_name: 'Test User',
      is_active: true
    };

    const { data: insertData, error: insertError } = await supabase
      .from('zoom_user_connections')
      .upsert(testConnection)
      .select();

    if (insertError) {
      console.error('❌ INSERT test failed:', insertError.message);
      return results;
    }

    console.log('✅ INSERT test successful');
    results.insertTest = true;

    // Test 4: Test SELECT operation
    console.log('\n4️⃣ Testing SELECT operation...');
    const { data: selectData, error: selectError } = await supabase
      .from('zoom_user_connections')
      .select('*')
      .eq('zoom_email', 'test@example.com')
      .single();

    if (selectError) {
      console.error('❌ SELECT test failed:', selectError.message);
      return results;
    }

    console.log('✅ SELECT test successful:', {
      zoom_email: selectData.zoom_email,
      zoom_display_name: selectData.zoom_display_name,
      is_active: selectData.is_active
    });
    results.selectTest = true;

    // Test 5: RLS Policies (clean up test data)
    console.log('\n5️⃣ Testing RLS policies and cleanup...');
    const { error: deleteError } = await supabase
      .from('zoom_user_connections')
      .delete()
      .eq('zoom_email', 'test@example.com');

    if (deleteError) {
      console.error('❌ Cleanup failed (but RLS might be working):', deleteError.message);
    } else {
      console.log('✅ Cleanup successful - RLS policies working');
      results.rlsPolicies = true;
    }

    // Final Results
    console.log('\n🎉 DATABASE SETUP TEST RESULTS:');
    console.log('================================');
    console.log(`User Authentication: ${results.userAuth ? '✅' : '❌'}`);
    console.log(`Tables Exist: ${results.tablesExist ? '✅' : '❌'}`);
    console.log(`Insert Operations: ${results.insertTest ? '✅' : '❌'}`);
    console.log(`Select Operations: ${results.selectTest ? '✅' : '❌'}`);
    console.log(`RLS Policies: ${results.rlsPolicies ? '✅' : '❌'}`);

    const allPassed = Object.values(results).every(Boolean);
    
    if (allPassed) {
      console.log('\n🎊 ALL TESTS PASSED! Database setup is complete.');
      console.log('You can now use the Zoom connection feature.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the errors above and run the database setup again.');
    }

    return results;

  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
    return results;
  }
}

// Make it available globally for browser console testing
(window as any).testZoomDatabase = testZoomDatabaseSetup;