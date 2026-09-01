// FlutterFlow Custom Action reference. Add `shared_preferences` if it is not
// already present, and call this action when connectivity returns.
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '/backend/supabase/supabase.dart';

Future<int> flushPartnerQueue() async {
  const key = 'qahwatna_partner_queue_v1';
  final prefs = await SharedPreferences.getInstance();
  final pending = (jsonDecode(prefs.getString(key) ?? '[]') as List)
      .cast<Map<String, dynamic>>();
  final remaining = <Map<String, dynamic>>[];
  for (final item in pending) {
    try {
      await SupaFlow.client.from('partner_submissions').upsert(
        item,
        onConflict: 'submitted_by,idempotency_key',
        ignoreDuplicates: true,
      );
    } catch (_) {
      remaining.add(item);
    }
  }
  await prefs.setString(key, jsonEncode(remaining));
  return remaining.length;
}
