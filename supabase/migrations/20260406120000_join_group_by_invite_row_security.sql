-- join_group_by_invite 内では、まだメンバーでない招待受け取り手が groups を SELECT するが、
-- groups_select_for_members は「作成者 or メンバー」のみ可のため 0 行になり参加できない。
-- 同様に group_members への INSERT は group_members_insert_by_owner によりオーナー以外が弾かれる。
-- トークン照合と auth.uid() へのバインドは関数本体で行うため、本関数の実行中のみ RLS を無効化する。

alter function public.join_group_by_invite(uuid)
  set row_security = off;

-- is_group_member は groups / group_members / group_expenses / expense_splits の
-- RLS ポリシーから呼ばれる。SECURITY DEFINER だけでは Supabase Cloud 上で
-- group_members の RLS を確実にバイパスできないため、明示的に row_security = off を付ける。

alter function public.is_group_member(uuid, uuid)
  set row_security = off;
