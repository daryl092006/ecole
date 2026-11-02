-- Migration datée : Affectation en cascade des 92 règlements 2026-2027 et régularisation des échéances
-- 1. Insère les 222 lignes dans escen.payment_allocations (liaison paiement -> tranche & ligne de contrat)
-- 2. Met à jour les settled_amount des échéances pour respecter le plafond de chaque tranche
-- Traçabilité et conformité avec paymentAllocationService et la règle d'affectation au plus ancien

do $$
declare
  v_admin_id uuid;
  v_year_id uuid;
begin
  select id into v_year_id from escen.academic_years where code = '2026-2027';
  if v_year_id is null then
    return;
  end if;

  select a.id into v_admin_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where r.code in ('RAF', 'IT') and a.active = true
  order by case when r.code = 'RAF' then 1 else 2 end
  limit 1;

  if v_admin_id is null then
    raise exception 'Compte RAF/IT actif introuvable';
  end if;

  -- 1. Insertion des affectations détaillées dans escen.payment_allocations
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('14df0aeb-e1dd-44cc-9b4e-f97da834a11f', '073ef8bb-b799-476a-a4d7-c2aa87470be1', '391745aa-baa5-45a7-8155-eaf0eb243cb6', '6bfae674-a2d3-4829-befb-7baffc8e324a', '52e78d19-935d-4c2b-b209-082397776952', 'fecc98f1-a828-48bf-88ce-5f03f3861b4d', '98255b97-6202-4ca4-afae-43bf1ced5c6b', 8621, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f11921b3-1be9-4e52-8b49-3f9a10804870', '073ef8bb-b799-476a-a4d7-c2aa87470be1', '391745aa-baa5-45a7-8155-eaf0eb243cb6', '6bfae674-a2d3-4829-befb-7baffc8e324a', '52e78d19-935d-4c2b-b209-082397776952', '20458523-42ba-4d43-ab66-2c8f0072502a', '98255b97-6202-4ca4-afae-43bf1ced5c6b', 41379, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f7625e2b-3cfe-4814-9449-0734249288fe', '0bf27544-be33-4d75-96f7-d4997f27ab94', '19c1b075-2b2e-49d5-bd49-2f45a972e853', '8dda1494-7e3a-4fea-b615-e41ec39b7389', '475e79f3-a3b7-4a5a-afa8-9bb85e118ea2', 'cd6a5d8d-6fb8-45ec-832f-8cf62488b09a', 'e71bedef-e243-479c-9866-9d38cdd1e323', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('8cad78f2-3a2e-4aed-9abb-72c721b80f25', '0bf27544-be33-4d75-96f7-d4997f27ab94', '19c1b075-2b2e-49d5-bd49-2f45a972e853', '8dda1494-7e3a-4fea-b615-e41ec39b7389', '475e79f3-a3b7-4a5a-afa8-9bb85e118ea2', '73b36c82-1319-40f8-bda3-899b2e2ccb07', 'e71bedef-e243-479c-9866-9d38cdd1e323', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ef6f4693-9459-4779-81c9-bee38b82ace4', '13816d90-9c47-4205-9df2-fce8ede647ba', '0e1f31b8-3856-40ef-96b1-b1ed414de8c4', 'ac282f25-dc2c-43c4-8057-9e2d03f97bc7', '90b82208-9d17-4085-ba9f-50f8b522f901', 'bbe2d742-b19b-4629-9969-e906d8bf134c', 'c5fa3fee-5520-4c28-99d8-17b403e0c577', 44737, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('0eef2c1e-2229-46e4-bbcb-63fca09a36d8', '13816d90-9c47-4205-9df2-fce8ede647ba', '0e1f31b8-3856-40ef-96b1-b1ed414de8c4', 'ac282f25-dc2c-43c4-8057-9e2d03f97bc7', '90b82208-9d17-4085-ba9f-50f8b522f901', '8a197c06-155e-4461-8699-7c66c3365e3e', 'c5fa3fee-5520-4c28-99d8-17b403e0c577', 5263, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a7142822-2bf7-4473-b925-2a3e357fb20e', '155f413b-1568-48a2-9566-50dc9caaf68d', '911cac4f-9e24-4af2-b126-c493476cba59', '0b2b2af1-7f0b-459a-b464-5e8fa93f886b', '17b3a25e-8abf-4699-b946-9183a0294f1d', '0ee450a5-a9a6-480a-a8f2-c0691dd3db81', '60d7e630-eb25-4932-96b6-776dc78191ab', 2500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('8ff9614b-b41d-4d83-a6b9-24aa50527933', '155f413b-1568-48a2-9566-50dc9caaf68d', '911cac4f-9e24-4af2-b126-c493476cba59', '0b2b2af1-7f0b-459a-b464-5e8fa93f886b', '17b3a25e-8abf-4699-b946-9183a0294f1d', 'f6fed2e1-386f-4d46-a65b-aef07b422aa7', '60d7e630-eb25-4932-96b6-776dc78191ab', 47500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('47dfd366-bae5-4a7f-9d4c-004a1f8ef3aa', '157d1740-164a-49c6-8aba-6f75385c3b96', 'ef1ae831-6e90-4480-b022-0ac62d99cb0e', 'feda393c-93e0-4747-b856-bef9c7b9c96f', '21e82744-5216-44fb-a29a-f29cd6c320b1', '578280f3-4d04-49df-b7db-13a206a3804f', '00068d6c-f243-43f0-aa57-0e04a9e2d92a', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fb60a95c-4c86-44c2-bcf5-77bb4d7396a1', '157d1740-164a-49c6-8aba-6f75385c3b96', 'ef1ae831-6e90-4480-b022-0ac62d99cb0e', 'feda393c-93e0-4747-b856-bef9c7b9c96f', '21e82744-5216-44fb-a29a-f29cd6c320b1', '0dbda0d8-39d7-4cdd-aaa3-2532edd17f65', '00068d6c-f243-43f0-aa57-0e04a9e2d92a', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('d1ebdcce-4042-4051-a0d6-531730c70cbe', '1a8dfdcc-a858-4525-9b73-aedf46d18b4e', 'cad20d96-e4d9-4bd5-aa8a-2bdd980513c8', 'd4d40c29-47d3-46f2-9e1e-a88c66cefaf6', '9e93fb78-f368-43f9-9a69-70ecf12558ef', '5b106ce2-0e07-42f6-bb5e-368fb9547eb0', '58b2a565-2531-492b-be71-ee01b424ba26', 5121, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('456ec196-0ac1-4991-913e-70dc5bbba013', '1a8dfdcc-a858-4525-9b73-aedf46d18b4e', 'cad20d96-e4d9-4bd5-aa8a-2bdd980513c8', 'd4d40c29-47d3-46f2-9e1e-a88c66cefaf6', '9e93fb78-f368-43f9-9a69-70ecf12558ef', 'f9180324-e413-4c75-99ce-eeaaa5e7febb', '58b2a565-2531-492b-be71-ee01b424ba26', 44879, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fafc94da-c6a3-498b-8a66-c3865dbfe61a', '208f949a-431d-4243-9d28-f5ac2a01380c', '9ec5f244-23ae-4bad-bd9c-e33e3bd18ff2', 'bd36910a-eff4-4286-a5bd-959953e6534d', 'e144724c-a5d1-481a-b7af-e337a7839dd3', '893634fe-f5cd-4abc-863d-8be4ba4c2356', '00fad9ac-fce3-4cef-83b2-4ef15aed3f86', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a1b3b183-69af-4977-b3f5-f704d9a67f9f', '208f949a-431d-4243-9d28-f5ac2a01380c', '9ec5f244-23ae-4bad-bd9c-e33e3bd18ff2', 'bd36910a-eff4-4286-a5bd-959953e6534d', 'e144724c-a5d1-481a-b7af-e337a7839dd3', '1d892784-8b88-4be6-a184-9e985ae4ec04', '00fad9ac-fce3-4cef-83b2-4ef15aed3f86', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('799b88bd-9dc8-4853-81e6-8d165565eb36', '21f30345-4a05-45bc-bf0b-7d10639c8d80', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '64ca6be2-79f2-4611-b45c-a1f875667ccb', '5a58c670-6c30-4cfe-90da-d2e62ac46aea', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('cefb3046-f584-4103-b49a-d7a1aa9845bb', '21f30345-4a05-45bc-bf0b-7d10639c8d80', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '03d9e758-47b6-49c7-912e-1f67e8762208', '5a58c670-6c30-4cfe-90da-d2e62ac46aea', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('88039d4c-5b22-425f-966b-0fb3454f882c', '28d894b9-bd56-4ee9-9331-867a64395f1b', '1fedda40-1001-4fce-9304-4051f8a8a048', '06433f7e-a87a-4b1e-ade3-01b2f2455b13', 'af146945-040c-4a22-9f7b-9cc7e3ba3f86', '85b7b96d-3617-4778-840e-cb8fabb55cee', '345412b4-040c-429c-951a-75a3cd4e366e', 42308, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('6d5aa456-306b-40bd-8e21-a928760f2b71', '28d894b9-bd56-4ee9-9331-867a64395f1b', '1fedda40-1001-4fce-9304-4051f8a8a048', '06433f7e-a87a-4b1e-ade3-01b2f2455b13', 'af146945-040c-4a22-9f7b-9cc7e3ba3f86', '4a95c1dd-db1f-42ba-9bd3-38d2de536c99', '345412b4-040c-429c-951a-75a3cd4e366e', 7692, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ce4461ff-4112-488c-8a2f-7957db436997', '28f70d51-8baf-4ea2-b57f-8d407a58b34f', '84474317-2cdb-47b6-bf3b-20e5174630b7', 'aec16433-b5ff-4059-8980-d7de5e33eb1f', 'd90a4146-a1cc-424b-9259-5cb441472e27', '36595e19-9112-4396-9aa5-478091abf3c1', '1f10e8c9-bd28-4cfe-b8de-447bc587dd02', 4762, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('cf21a353-7524-4c76-a2fc-bc7d6432d8d7', '28f70d51-8baf-4ea2-b57f-8d407a58b34f', '84474317-2cdb-47b6-bf3b-20e5174630b7', 'aec16433-b5ff-4059-8980-d7de5e33eb1f', 'd90a4146-a1cc-424b-9259-5cb441472e27', '543b1d13-64a9-4e4c-93ba-eb57cc3ccde0', '1f10e8c9-bd28-4cfe-b8de-447bc587dd02', 45238, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('0acc0f50-6424-413a-9c12-cbcbe7391a1c', '2999d5e7-5593-46d2-87d5-d54284aabccf', '56c03081-7481-41d7-9429-5ccf19a7e722', 'eb4a8b4d-33b2-4224-831a-d26c3a5dbf93', '99ce326b-9ffb-41e3-a0b1-d2e71c1723e8', 'aa637be7-df6b-45c9-9f3f-2a6cdbf2607f', '0cec431e-67ae-40df-be8a-1f79403faa1c', 4717, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ca85bed2-0863-4a3b-acfe-4b639e37394a', '2999d5e7-5593-46d2-87d5-d54284aabccf', '56c03081-7481-41d7-9429-5ccf19a7e722', 'eb4a8b4d-33b2-4224-831a-d26c3a5dbf93', '99ce326b-9ffb-41e3-a0b1-d2e71c1723e8', '493ba449-c796-422f-a293-7ce65579a8c4', '0cec431e-67ae-40df-be8a-1f79403faa1c', 45283, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('d7b64b5b-52b5-40c4-b3f5-3d9934e76688', '2d2f99f8-b20a-4133-a86d-28e4ee8cf0d4', '1a91e47b-380f-4eff-bd5d-fccdf8351f7e', '902231fa-a201-4447-8df3-8b2a426ca1d8', '6e12d7c1-dd32-4c84-9d0e-b92298b89d95', '1b88f51b-35e7-49ee-b147-cc324a5d45c3', '8142fc51-bd88-441f-a140-074b23304b2b', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e0ea2d79-39b9-4994-ac38-4794c152241f', '2d2f99f8-b20a-4133-a86d-28e4ee8cf0d4', '1a91e47b-380f-4eff-bd5d-fccdf8351f7e', '902231fa-a201-4447-8df3-8b2a426ca1d8', '6e12d7c1-dd32-4c84-9d0e-b92298b89d95', 'f7522c52-91ec-47b0-8285-f62223ffa6d0', '8142fc51-bd88-441f-a140-074b23304b2b', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('0b4bd4e8-7f89-4993-b52e-72be43ad4861', '2d481b81-5a19-479d-9e27-906a1aa86dc6', '896b7226-1492-40f4-a28b-bd5cdd4d1e1c', '29b24ed2-ed08-45dd-acf1-f679744debbd', 'c3d9f057-c8a0-4752-8368-655bbb972730', '2aaed534-8a38-480e-ad31-55d0a69440cb', '67a3e714-3649-4251-80d1-01e1b2729d4e', 5821, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('62dfc6e4-24db-47ef-b51e-e957a06b6e30', '2d481b81-5a19-479d-9e27-906a1aa86dc6', '896b7226-1492-40f4-a28b-bd5cdd4d1e1c', '29b24ed2-ed08-45dd-acf1-f679744debbd', 'c3d9f057-c8a0-4752-8368-655bbb972730', '9b77394f-0c80-4d39-8acb-343996cd943e', '67a3e714-3649-4251-80d1-01e1b2729d4e', 44179, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('15053fd4-daea-4998-86c8-c07cc9a51cd9', '31dfbf96-c524-490e-a6ae-add8095db752', '9e0e6ffc-0f61-4a87-b02e-fbdf023ffe8b', 'ed8e767c-267d-4d68-b9c8-adfa87eb4ff6', 'ae8ea686-dbfe-49d7-afbd-103d8859bc13', '985a1e28-80ab-4976-81af-1c31bff1f587', '8dafd635-4b28-493c-97d6-43631b57fe79', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f7b67fd1-6896-477d-89c6-1fe4742b4a10', '31dfbf96-c524-490e-a6ae-add8095db752', '9e0e6ffc-0f61-4a87-b02e-fbdf023ffe8b', 'ed8e767c-267d-4d68-b9c8-adfa87eb4ff6', 'ae8ea686-dbfe-49d7-afbd-103d8859bc13', '398f588c-010c-4e4f-b9af-99b63142a46c', '8dafd635-4b28-493c-97d6-43631b57fe79', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c985fe25-e875-4acc-ba09-80394895dc7e', '3354cee6-0f71-4203-9a3b-5731a8986c46', '8108f7b1-7ddd-4c1c-9e35-8348014fa6af', '95ae9b80-d7c7-45b0-a794-7fd4acbd4b64', 'd955d05f-06b5-48ad-a6c0-2fb0a80da1b4', '44bbeeec-4ff4-441e-8bfd-2d698092884e', 'e259cc25-c28b-40b4-af40-7ac8af32ebfa', 47500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('00dca06e-2fc0-4c50-b838-122450bab89f', '3354cee6-0f71-4203-9a3b-5731a8986c46', '8108f7b1-7ddd-4c1c-9e35-8348014fa6af', '95ae9b80-d7c7-45b0-a794-7fd4acbd4b64', 'd955d05f-06b5-48ad-a6c0-2fb0a80da1b4', 'e556fd28-426c-49c3-b96c-d1a5003f8836', 'e259cc25-c28b-40b4-af40-7ac8af32ebfa', 2500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('bc993b72-ca3d-4e3f-b865-66e60a285958', '3896e3e4-64ab-4a12-87c3-109bf8a24af1', '2f078e0c-17b3-4edc-9aca-194d62f504f1', 'ce99e037-a116-4b77-83e4-19af14739477', '2865b5ea-fbba-4198-a148-ee35a5a835e1', '27110e9c-ba00-4899-bbfa-37e89a5c001e', 'def64fe4-8019-46a5-acee-e4762a314033', 5821, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('db075ba9-d041-4933-bf17-a8ae62d82a24', '3896e3e4-64ab-4a12-87c3-109bf8a24af1', '2f078e0c-17b3-4edc-9aca-194d62f504f1', 'ce99e037-a116-4b77-83e4-19af14739477', '2865b5ea-fbba-4198-a148-ee35a5a835e1', 'a1d43f6a-8c79-455e-aa5a-e0ccbb995d31', 'def64fe4-8019-46a5-acee-e4762a314033', 44179, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f2da6301-5a93-4ea5-a0d9-84e5abbea1e3', '3aef2b33-2ded-4053-9096-c2344dab9f59', '404c6d7b-4139-4c96-934a-2d117764cb94', '35d0cc8b-5eb5-4cc0-b51e-9e0bf3e38092', '9c8143da-4b96-4c68-9ca6-15d2261fe900', '4ae70fae-dcfb-45cd-8940-1c3f381d9c68', '97b9238b-70f3-4974-b42e-3805fa3cd619', 4831, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('b61bcc58-467f-4f86-890f-f880a895271a', '3aef2b33-2ded-4053-9096-c2344dab9f59', '404c6d7b-4139-4c96-934a-2d117764cb94', '35d0cc8b-5eb5-4cc0-b51e-9e0bf3e38092', '9c8143da-4b96-4c68-9ca6-15d2261fe900', '934b4cd8-bd39-4852-ad3f-0d3a4162e861', '97b9238b-70f3-4974-b42e-3805fa3cd619', 45169, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('74cb0f4c-ea7f-45ce-9f29-bcae6d00a6ef', '3c13e7f0-b691-41a4-a2d6-907a30d5a545', 'a9433cf6-f10a-4fad-a65d-ffee1a5fbe99', '6fe40cdf-fa07-477e-b048-78793403b0c7', '78b4958c-98fa-4df1-b421-fa8c184804e5', '97afd8da-ebfb-4295-8552-f0cd6a0165f1', '40e15f8d-1982-4459-9970-a122dc050ecc', 44737, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('487f340a-eebc-43c8-8b45-a7c4a218ed7c', '3c13e7f0-b691-41a4-a2d6-907a30d5a545', 'a9433cf6-f10a-4fad-a65d-ffee1a5fbe99', '6fe40cdf-fa07-477e-b048-78793403b0c7', '78b4958c-98fa-4df1-b421-fa8c184804e5', 'bba27f61-8543-4b8a-bdb1-051de76d704f', '40e15f8d-1982-4459-9970-a122dc050ecc', 5263, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e27c80ee-1976-447b-a85a-af1fa1adb77f', '3c58b5a2-0854-4536-9234-bd6776e3b6f4', '4f744832-d16d-40f2-899f-4c6ef2a938d4', '19efae49-f696-4da9-b482-f72ea6cf1147', 'b869b6c0-e05f-4ea6-b293-f949650035c0', '6d4bc5ae-0d17-4227-ab27-35546437d2e4', '0057f210-652c-4281-b2c3-2b9a103080d4', 42308, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('dadfd400-8ab3-458e-8fbd-2f3e22bf3520', '3c58b5a2-0854-4536-9234-bd6776e3b6f4', '4f744832-d16d-40f2-899f-4c6ef2a938d4', '19efae49-f696-4da9-b482-f72ea6cf1147', 'b869b6c0-e05f-4ea6-b293-f949650035c0', 'cb0ce4f7-16b5-488f-b47b-0c687f01b1d4', '0057f210-652c-4281-b2c3-2b9a103080d4', 7692, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('4f2c8b0d-3b93-47a4-9608-8be1b0a9b71c', '3c7aeb88-4aae-403d-8e96-5920a2cbb988', 'e34874ed-6d43-414a-865c-5291e8ac044a', 'c693557d-8c98-4a52-a381-3639a41cb711', '337574e3-de42-4cc1-a1ca-bc8341449fea', '283e32fb-d3bf-4b08-bfef-690afc51f285', '36f4381f-873e-4057-a9cb-d939c7dfcaf1', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('76d1b110-e9ef-4ba0-b2fd-c0c395c79afc', '3c7aeb88-4aae-403d-8e96-5920a2cbb988', 'e34874ed-6d43-414a-865c-5291e8ac044a', 'c693557d-8c98-4a52-a381-3639a41cb711', '337574e3-de42-4cc1-a1ca-bc8341449fea', '17426e53-ab50-4003-908d-420e6d3b19c7', '36f4381f-873e-4057-a9cb-d939c7dfcaf1', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('4b39a64b-d4c9-4785-adf6-dfc7ac7d61f1', '414e2d8f-894c-4bad-8cc6-a3b4cd892f3a', '54b79fe0-17ed-4067-a47d-5b964cc9aa64', '2d6b7269-e15b-48ff-a195-d9f553a8ec24', 'df6a02d2-055e-45b8-befd-626c129325b8', 'ad0b0195-f0b6-40fd-8763-e288f354e35d', 'dff52db4-5331-402e-a947-9f7923e246fb', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('24df43a8-699f-42e4-9081-d7f4a2a9837b', '414e2d8f-894c-4bad-8cc6-a3b4cd892f3a', '54b79fe0-17ed-4067-a47d-5b964cc9aa64', '2d6b7269-e15b-48ff-a195-d9f553a8ec24', 'df6a02d2-055e-45b8-befd-626c129325b8', 'e2a2fe1a-c20e-4adb-ab65-ab9762acbf88', 'dff52db4-5331-402e-a947-9f7923e246fb', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f49f7e1a-fd41-4703-8f70-2cee65f6af7e', '43ab04f7-5e50-4b57-b241-fa6e13f7f5c5', '811763d3-d530-47d0-ae2c-94a4ea8a8191', 'e03dfff6-8127-406d-898e-f94e2c369e56', 'b5762da4-5d09-4fea-943a-c8772a5f8271', 'd0511be6-0d1f-4765-ac55-787bf1e78a7e', 'a1b6108b-cc93-42ab-86c8-80cf15fa3161', 42308, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('666ec0ea-c3eb-454a-b865-4db5a8ad70d0', '43ab04f7-5e50-4b57-b241-fa6e13f7f5c5', '811763d3-d530-47d0-ae2c-94a4ea8a8191', 'e03dfff6-8127-406d-898e-f94e2c369e56', 'b5762da4-5d09-4fea-943a-c8772a5f8271', 'f23bdf08-2b62-4610-bd7c-fdb9c83ab8d2', 'a1b6108b-cc93-42ab-86c8-80cf15fa3161', 7692, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('276e119c-f4c8-4981-ba81-5ec0fb365675', '488cc680-99e4-44ce-a887-a4a4e850663d', '467dbf68-7be6-4a39-aada-ab7e8b3c7f8f', '91c34a74-bd3d-4a17-b62f-861328f12792', 'c1bd5740-16cb-444c-b464-97c189b1f748', 'd2925d55-e0c4-4128-b964-4827883e5139', '712fd857-d77e-46fa-8c67-d14d8f1ee276', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('077e5159-6001-4d8e-9ed4-d0ab4c4fd91f', '488cc680-99e4-44ce-a887-a4a4e850663d', '467dbf68-7be6-4a39-aada-ab7e8b3c7f8f', '91c34a74-bd3d-4a17-b62f-861328f12792', 'c1bd5740-16cb-444c-b464-97c189b1f748', '6d236453-d92b-4303-9b8e-83dadd15ff29', '712fd857-d77e-46fa-8c67-d14d8f1ee276', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('701f014f-f392-4902-ad1c-34ae0af40c7d', '4b0c8c25-4310-4d02-9e36-14b7776b33b5', '68684c53-47e4-4f57-a2c1-85a5ca3a6603', 'b0e4be96-36e4-4d80-97e1-ab6a2246721e', '527e5325-8a9b-4b38-b678-47450dabb6fd', '311801a8-7419-4aca-8188-4b953fca14cd', 'b3ae368e-ba28-40bd-8ba9-6246987439a6', 1471, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('0ddf3648-aaaa-46be-bb26-46dacbdee3fc', '4b0c8c25-4310-4d02-9e36-14b7776b33b5', '68684c53-47e4-4f57-a2c1-85a5ca3a6603', 'b0e4be96-36e4-4d80-97e1-ab6a2246721e', '527e5325-8a9b-4b38-b678-47450dabb6fd', 'ab0b9e32-7b09-48fa-a41a-12855097559c', 'b3ae368e-ba28-40bd-8ba9-6246987439a6', 48529, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('3b36d5b3-43bf-4ea7-8098-efb822a52619', '4dd8951d-35b3-41ed-a303-19abe7be7f89', '9634c172-e033-4284-9720-61173493cbb9', 'c9d0d991-195d-416a-bda2-1f42b8d43300', '227bde73-b5c2-43bc-972c-c41fa3cdf0a8', '9a554541-a71b-41ce-b29c-099c404535ed', '254956d8-aa3f-4191-978b-9e069da8eb43', 42308, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c5cfd3df-fabb-4cf7-981f-a137403bfd34', '4dd8951d-35b3-41ed-a303-19abe7be7f89', '9634c172-e033-4284-9720-61173493cbb9', 'c9d0d991-195d-416a-bda2-1f42b8d43300', '227bde73-b5c2-43bc-972c-c41fa3cdf0a8', '9a2890df-574e-4452-bfaa-e2a51aef6c48', '254956d8-aa3f-4191-978b-9e069da8eb43', 7692, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fed11b8d-0033-45b2-8cce-0f4ef969fe46', '50d30f1a-e343-4d36-b6b0-2d054775c04a', 'c53d3c95-39d8-48fe-a984-7004bce4a387', 'b069cae4-baf8-45d7-a303-f97fea921f61', '0599c9d9-39e9-42bb-a6ee-aebd5cdd1336', '2819c432-5a80-40a1-b51a-49ec28cf809a', '05e9a8d5-b109-43a6-b7ca-77f19502dfdf', 47500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('bb17c6d2-3288-4755-9f1e-2ec7279704fd', '50d30f1a-e343-4d36-b6b0-2d054775c04a', 'c53d3c95-39d8-48fe-a984-7004bce4a387', 'b069cae4-baf8-45d7-a303-f97fea921f61', '0599c9d9-39e9-42bb-a6ee-aebd5cdd1336', '70341468-6842-4242-9216-81eaea96e886', '05e9a8d5-b109-43a6-b7ca-77f19502dfdf', 2500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('06a1f9b4-01c8-4040-836c-0af27b89ae9d', '6019a3fd-ec50-4528-a393-5e875fbad77b', '30856792-a1f8-4ec1-b25f-dfb756b667ea', 'f51ad0e5-f702-4e6d-a1ec-ddc45a88618a', '1747c25c-875a-4150-9839-bc425aa02a61', 'c0b3942a-5687-4d0d-a216-6f1a7c01e454', '4539117e-8fe3-4d27-9c66-ac430a7dd4f2', 1471, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('d180a592-a3be-4aba-ba77-37782f15e9cd', '6019a3fd-ec50-4528-a393-5e875fbad77b', '30856792-a1f8-4ec1-b25f-dfb756b667ea', 'f51ad0e5-f702-4e6d-a1ec-ddc45a88618a', '1747c25c-875a-4150-9839-bc425aa02a61', '29875402-4b13-4a85-baa5-582b786916dd', '4539117e-8fe3-4d27-9c66-ac430a7dd4f2', 48529, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('21f24192-f5c4-4dd6-9bb2-d3739a8200e1', '6211d52b-0228-4a11-bb18-3b3009805863', '15881bda-9066-4eb6-baed-ccbb7fc52f96', 'e93a49ce-4fc8-484e-b318-343381cb0de3', 'b4a2b6c9-fe4d-43ff-be4f-909e0a989d74', '1035ae4d-bf2f-4dfe-8b1a-f13eb5ccaee1', '88c4c8c9-0f2c-4ee4-bae4-e6eb780efd49', 2778, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('80919373-6a52-49ea-9f9b-6f1ce7580fc8', '6211d52b-0228-4a11-bb18-3b3009805863', '15881bda-9066-4eb6-baed-ccbb7fc52f96', 'e93a49ce-4fc8-484e-b318-343381cb0de3', 'b4a2b6c9-fe4d-43ff-be4f-909e0a989d74', '907b3315-8327-47a8-b0a2-3475ecf1773a', '88c4c8c9-0f2c-4ee4-bae4-e6eb780efd49', 47222, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('551e9326-65b3-4d65-a50e-39c3564d8f92', '63c23437-232a-4c25-8e71-4e49002e8d84', '7488118f-09a9-4a7b-92b3-a10ff07215be', '48fcc9cb-2034-4ce7-9c88-6af1dda03b98', '14182a57-70b2-47d6-b407-77a6c1492b2b', '9d575ae6-0e78-4124-b0fd-1977ede6c0ca', '5a4b55a0-13ac-4c93-bfb6-da0830c2d1b0', 2778, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a84b272f-748c-472e-8ba6-8b2e01134e2d', '63c23437-232a-4c25-8e71-4e49002e8d84', '7488118f-09a9-4a7b-92b3-a10ff07215be', '48fcc9cb-2034-4ce7-9c88-6af1dda03b98', '14182a57-70b2-47d6-b407-77a6c1492b2b', '47bd7c7a-b2fe-47e6-a864-93b3007c0a60', '5a4b55a0-13ac-4c93-bfb6-da0830c2d1b0', 47222, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e66155bf-779b-4609-b1df-4609f5dffcce', '66246e7e-e614-470f-9364-82c0e727c772', '00387a36-f713-43e7-a82d-51a9f76bc689', 'dbf4a910-1237-4449-b1f5-200a4a4056c1', '7a7e4af5-20ba-4e18-8717-6474cc9115aa', '68568485-6b5a-4888-91d1-b39bc67a91b5', '18a6ff1a-a1b8-4588-ae72-29049ccc48fc', 42308, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a593b408-97a1-4eeb-bc28-5c2c6bef9fac', '66246e7e-e614-470f-9364-82c0e727c772', '00387a36-f713-43e7-a82d-51a9f76bc689', 'dbf4a910-1237-4449-b1f5-200a4a4056c1', '7a7e4af5-20ba-4e18-8717-6474cc9115aa', 'b3cda2b3-62ed-41d2-bc85-b5372e2471b8', '18a6ff1a-a1b8-4588-ae72-29049ccc48fc', 7692, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('39e5b017-c44e-4ab3-ac44-2d32f95e8a37', '66e01657-1415-442e-ab09-fee44808911b', 'cb19a482-a207-4339-bee4-afc79ed7418f', '77e9c1d0-0400-463c-a745-37e03b7f0f2e', '3e60e68b-2755-444b-81eb-337d3aded29a', 'b27de68f-4190-4a5a-8a7b-d37a54db8010', '94e8804a-af24-49a9-a930-08770a296374', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a48739ab-37eb-4e7c-9121-9fde0f49b2a9', '66e01657-1415-442e-ab09-fee44808911b', 'cb19a482-a207-4339-bee4-afc79ed7418f', '77e9c1d0-0400-463c-a745-37e03b7f0f2e', '3e60e68b-2755-444b-81eb-337d3aded29a', 'b1da941c-21c4-4211-9cc2-c3155857b7f3', '94e8804a-af24-49a9-a930-08770a296374', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('24702296-5390-4cdc-8701-edcdceefa0e0', '68487d42-4bd7-431d-a37a-2b6e777f289d', '031b6614-fd3c-4752-8998-cc9d379d1425', '94bd418a-d1cc-4ecb-ab01-3935fb700b21', 'cc2c2973-34a9-4ad6-a922-facb04e085fc', '2c27c9f8-302f-4c9e-a811-40f85661618c', '451e88fb-798f-411b-a352-fd06a4b1f0e8', 2778, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('1d9f58f7-e418-48cb-a2d6-5794eae54961', '68487d42-4bd7-431d-a37a-2b6e777f289d', '031b6614-fd3c-4752-8998-cc9d379d1425', '94bd418a-d1cc-4ecb-ab01-3935fb700b21', 'cc2c2973-34a9-4ad6-a922-facb04e085fc', '3fa8a692-f809-473f-bd16-0f50d91f24b0', '451e88fb-798f-411b-a352-fd06a4b1f0e8', 47222, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c25b6541-9172-403c-9294-a4887fc61b01', '6a1dbc90-a042-4360-98f2-a1530b4c1d5b', 'dd867388-d6f3-4453-8dcc-be4b1a34f149', '9ba06142-bcc7-42f4-a0eb-d89805be4069', 'a4bbdbf3-2a1f-4251-96cb-82ed20ce8418', '91ded5d2-5589-4033-8614-c8adbf740cfe', '1b492a01-597f-44c5-bab0-2676fb9bb043', 2778, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('03a8dac2-bf1f-40da-a738-6ca27f7e3033', '6a1dbc90-a042-4360-98f2-a1530b4c1d5b', 'dd867388-d6f3-4453-8dcc-be4b1a34f149', '9ba06142-bcc7-42f4-a0eb-d89805be4069', 'a4bbdbf3-2a1f-4251-96cb-82ed20ce8418', '940c8767-a872-4ca2-82b7-440d72021c98', '1b492a01-597f-44c5-bab0-2676fb9bb043', 47222, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fbfa1a5a-b58f-4e92-b7c1-2eff2dfdb07e', '6daa46c2-dd0d-4dd2-ad15-737ad5198edc', '79a85c24-c46e-4313-9a4f-0dbe4c7c2ffa', 'b87d12dc-b5a6-4c1c-8424-799ccbc4fadc', '828382b8-a2c9-473f-8c45-c47b51f6723b', '67b85260-c2a4-48d7-8eec-1f55ab1917c4', 'b9cad8c4-c779-4850-89b1-b4b97eabc244', 47500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('0ec42e91-2991-4fd4-bfda-2b40eecf37ad', '6daa46c2-dd0d-4dd2-ad15-737ad5198edc', '79a85c24-c46e-4313-9a4f-0dbe4c7c2ffa', 'b87d12dc-b5a6-4c1c-8424-799ccbc4fadc', '828382b8-a2c9-473f-8c45-c47b51f6723b', 'b8ddfbb7-32a8-4c16-af65-56e62f4d3d9e', 'b9cad8c4-c779-4850-89b1-b4b97eabc244', 2500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('8b52c9ba-51e0-4401-8bf7-08052e09a91c', '6ff3deca-0b67-4450-baac-cffe205fa269', '539aa6d3-876c-422e-81e4-c382640e10c6', 'b37fb687-bd54-452b-8844-e9e880ca7568', '9e5e570d-5c44-44cc-93c5-5836de4a98b5', '9034be8b-ec01-4616-af60-235539c3dd93', 'c37454c5-b803-478e-8b05-f3132eca635d', 8621, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('0dc91b9a-a94b-45ab-b962-6b7bc5150cb8', '6ff3deca-0b67-4450-baac-cffe205fa269', '539aa6d3-876c-422e-81e4-c382640e10c6', 'b37fb687-bd54-452b-8844-e9e880ca7568', '9e5e570d-5c44-44cc-93c5-5836de4a98b5', '6066a33a-0d3b-4571-ac13-126bb61cdfc1', 'c37454c5-b803-478e-8b05-f3132eca635d', 41379, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a1cbcbf2-584d-4cca-84e1-8ce25bc1e159', '71a04040-ca24-4f51-a7a3-4d74ea8d3e6d', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', 'f240ace0-531e-4865-b913-a864384a3d87', '31176dbc-506c-40b5-ac9d-fdb4af006997', 42308, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('30e64d41-6559-40f8-bea0-ba60a0e5d905', '71a04040-ca24-4f51-a7a3-4d74ea8d3e6d', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', '59fa8ec0-cb90-4230-98f3-7b1a09f7e31a', '31176dbc-506c-40b5-ac9d-fdb4af006997', 7692, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('b305576a-9cec-48c5-8e5e-7b7500953e30', '72991a7b-7171-436e-b876-a6c6ea99271f', '07547ca3-7209-4398-9e01-01f013fded06', 'dea089e6-a6b2-43be-9470-1ea5ec44894e', 'f2751afd-d580-4ebd-880c-11c12ec51a5e', '5987fb59-4284-428e-a899-a7ea6c243246', '79de32ef-ead6-4e21-9de1-cdeaf15a2f96', 45349, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('82dcbaa4-ab2b-42c4-8977-6ee0b813003b', '72991a7b-7171-436e-b876-a6c6ea99271f', '07547ca3-7209-4398-9e01-01f013fded06', 'dea089e6-a6b2-43be-9470-1ea5ec44894e', 'f2751afd-d580-4ebd-880c-11c12ec51a5e', '124e7217-3563-486e-b642-5e86890546e4', '79de32ef-ead6-4e21-9de1-cdeaf15a2f96', 4651, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ff5eb604-fa98-4c7b-a94f-e6d3aeba5d1f', '789e5cfc-c5c0-4c9b-b68c-5eafc9295a5b', 'eaafc956-8400-4cef-98e5-dcbee798b329', '2a5a73dc-4941-47de-85ee-c84c98cb4384', 'c13f0e5b-7c8e-44d1-aa9a-60422d5bd00e', 'b6ad4050-5767-4f07-99b6-7060b45185f9', 'c4abbfea-30ce-4620-a378-f2c01e208fd1', 4717, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('8b82fa35-d2d7-43fa-bee8-415697b81a65', '789e5cfc-c5c0-4c9b-b68c-5eafc9295a5b', 'eaafc956-8400-4cef-98e5-dcbee798b329', '2a5a73dc-4941-47de-85ee-c84c98cb4384', 'c13f0e5b-7c8e-44d1-aa9a-60422d5bd00e', '8af7599d-8a63-49d8-a381-c6780b9c4d04', 'c4abbfea-30ce-4620-a378-f2c01e208fd1', 45283, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('76ada6bb-873a-4d42-aa31-1286bae1dab7', '7a9b0a90-e079-4eee-8f95-1378e4b2cf3b', '742d3bce-1771-4834-9d15-b0879a017ab6', '16454ace-375c-45c3-8606-3a0e77e1dbda', '91a1134c-6428-4535-8089-18f19adabe3d', '42f70115-c827-4a98-b320-96edc72e8ea7', 'adcd0e63-9358-448d-924d-8f15200bdb68', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('48c95d1f-f459-4a9d-aabd-81f6e2ffdfd8', '7a9b0a90-e079-4eee-8f95-1378e4b2cf3b', '742d3bce-1771-4834-9d15-b0879a017ab6', '16454ace-375c-45c3-8606-3a0e77e1dbda', '91a1134c-6428-4535-8089-18f19adabe3d', '5b9782da-3bfe-4031-aa6a-ec980e0fd0d4', 'adcd0e63-9358-448d-924d-8f15200bdb68', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('93b52c6f-83c5-43d1-8ec6-ff9487c99916', '7d128304-3a07-45f9-8ed2-b77ee59d23dc', '64a8ccf3-2e8c-4bad-b438-04a37edffe26', 'f22492fc-364c-49a4-93fb-cfe90f56923c', '32087164-735d-4b8f-8b6a-650eadc51a14', '01fccd34-98d9-44c6-b6c4-dd0a94777c44', 'c3706ca5-2cf0-4f35-95bd-ec88005edba4', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('11bc8950-bc86-44a5-ab4b-ac906745d584', '7d128304-3a07-45f9-8ed2-b77ee59d23dc', '64a8ccf3-2e8c-4bad-b438-04a37edffe26', 'f22492fc-364c-49a4-93fb-cfe90f56923c', '32087164-735d-4b8f-8b6a-650eadc51a14', 'f4d43eaa-e1b2-4bcd-b433-09220d060de4', 'c3706ca5-2cf0-4f35-95bd-ec88005edba4', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('665ce3c7-0b5f-4336-ad86-c7555da122e9', '7fbc3007-8795-4925-abc9-99be5f52f478', 'f10d5a73-bf5e-4f2f-931c-c52fe96a97a1', '69fdb68d-7b6a-4127-8009-5ffda57f8f18', '123e9778-9d87-4d37-b8c9-9382f412d07d', 'b0a7925f-b82e-4772-90dc-32798292a671', '34fe08bf-deba-442b-ba2e-f1b537eaaed1', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f8971ccd-c3fb-4134-b6a4-8f35a00ca348', '7fbc3007-8795-4925-abc9-99be5f52f478', 'f10d5a73-bf5e-4f2f-931c-c52fe96a97a1', '69fdb68d-7b6a-4127-8009-5ffda57f8f18', '123e9778-9d87-4d37-b8c9-9382f412d07d', 'a7fbd407-c08f-4b08-a11a-f29e956f1b4b', '34fe08bf-deba-442b-ba2e-f1b537eaaed1', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('08483065-fbf8-41ab-a64e-587195b1409c', '83cf04db-e4e4-4a8f-8251-6f13215fefba', '9a683eec-60de-4b14-b3d9-f08843bbffbc', '6899e7e9-5cb2-4cff-ad2d-53c80993b8c4', 'c12bc23f-c21b-4e93-9d2e-a6a9155dedc3', '890ef6d9-f651-4cd3-a428-099568c7d043', 'cec13ffb-33cb-40a0-8c0c-5e8f0863b386', 2500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e23fad89-4e94-46a4-b7ef-78cbe1b3511d', '83cf04db-e4e4-4a8f-8251-6f13215fefba', '9a683eec-60de-4b14-b3d9-f08843bbffbc', '6899e7e9-5cb2-4cff-ad2d-53c80993b8c4', 'c12bc23f-c21b-4e93-9d2e-a6a9155dedc3', '8b580ac0-6dbf-4126-bb98-ee36b763c1dd', 'cec13ffb-33cb-40a0-8c0c-5e8f0863b386', 47500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c7d11850-95ad-4d21-8474-fe9aeb342b66', '8423a4c0-fb8a-44e1-97cb-36fc8389cc67', '8734b87c-5a5e-4f51-a5ac-bc8b43df3483', 'dcc15f85-b932-4a89-a22c-cc781d1d2afa', 'b07c70b1-3861-4244-96d1-d0a205f27dbd', 'bbd6c56c-f6da-4bc3-b498-50500463567c', '3bc887a2-d2a4-4d5d-8109-12c9ec9bf9a5', 42308, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('615c1cd9-d625-4f2f-aaca-1b3946c10095', '8423a4c0-fb8a-44e1-97cb-36fc8389cc67', '8734b87c-5a5e-4f51-a5ac-bc8b43df3483', 'dcc15f85-b932-4a89-a22c-cc781d1d2afa', 'b07c70b1-3861-4244-96d1-d0a205f27dbd', 'af55c95b-7b76-4c26-9cca-4781055e52a1', '3bc887a2-d2a4-4d5d-8109-12c9ec9bf9a5', 7692, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('17c50caf-2d71-4cdc-b313-626f2e51af33', '8ff19b5d-44ed-4f22-9953-8e6490ee3ea3', 'e2758f88-88af-4ffa-adb3-daed1142ac50', '0048b5ff-142b-441c-9eff-397566128bd1', 'd3b0d8a6-b7dc-4023-a99f-695d1f4af437', '1e8e75c8-3cdb-4121-a29f-e37a4fe64439', 'cc32791d-df9b-4d08-babc-b3416aa826f2', 2778, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c807b749-494c-4545-9dc1-f0e8738c9705', '8ff19b5d-44ed-4f22-9953-8e6490ee3ea3', 'e2758f88-88af-4ffa-adb3-daed1142ac50', '0048b5ff-142b-441c-9eff-397566128bd1', 'd3b0d8a6-b7dc-4023-a99f-695d1f4af437', '6063100b-e949-41f1-a4d6-b1b3c725c102', 'cc32791d-df9b-4d08-babc-b3416aa826f2', 47222, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e9bebdbd-a9d3-4954-80ce-4dbc6ab0ca8a', '90b9f355-2b0e-4931-8e8d-08232281e1fa', '62b5eebd-30c9-4ea5-9571-45ac97d195a3', 'c2fbb491-8204-41eb-ab67-30ad8a8d87c4', 'd5b6806b-3933-44e7-bdfb-b91103def9f4', 'd2b93719-84ca-4ce4-9de0-d291d90c866c', '2cf0e59c-385b-4e32-bbf0-02813c85a13a', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('47c4982d-b080-478a-844e-9a37fc908ca1', '90b9f355-2b0e-4931-8e8d-08232281e1fa', '62b5eebd-30c9-4ea5-9571-45ac97d195a3', 'c2fbb491-8204-41eb-ab67-30ad8a8d87c4', 'd5b6806b-3933-44e7-bdfb-b91103def9f4', '4a54a37c-2cf0-4b7a-8152-f4638b954fd3', '2cf0e59c-385b-4e32-bbf0-02813c85a13a', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('4bf26de4-d803-46e9-bb1c-da10f34f9dad', '93077eca-d49e-494a-8200-c4b28f89a09d', '4a1c1ab7-ef42-4450-8e7e-1ab8eb33f09b', 'f19cbbe6-39d6-47a4-899e-ba9e7cf10161', '4913dde4-5965-47ad-9a8a-de1e602b5b13', '3692c1bc-da03-4ecd-9dcb-2878473d4de6', '2626c28e-b291-4b1d-aa08-e38f5aa339e9', 2778, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('055c599f-36d2-4280-aae5-440f7fa85756', '93077eca-d49e-494a-8200-c4b28f89a09d', '4a1c1ab7-ef42-4450-8e7e-1ab8eb33f09b', 'f19cbbe6-39d6-47a4-899e-ba9e7cf10161', '4913dde4-5965-47ad-9a8a-de1e602b5b13', 'f3ccdbae-187d-4bac-8c91-434b1b506fc8', '2626c28e-b291-4b1d-aa08-e38f5aa339e9', 47222, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('88e681fe-ae43-4d95-acf8-93e5c7310860', '94b63a17-e31c-4bf8-a4d7-614139e01a24', '980e56d3-02dc-470e-ac06-ffb0804e38e1', 'a416a2b1-7956-419d-9b17-36f3e08b2575', 'bf381f5f-f716-4c3d-b32e-862ed69ffd03', 'dff2616e-661a-4ca7-8c39-ab835b6adc06', 'f989b15a-dad8-4c9d-9d8c-81cebdacc0a7', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('d49ecab2-8d12-4f4d-aef4-0ea3c8f1ff58', '94b63a17-e31c-4bf8-a4d7-614139e01a24', '980e56d3-02dc-470e-ac06-ffb0804e38e1', 'a416a2b1-7956-419d-9b17-36f3e08b2575', 'bf381f5f-f716-4c3d-b32e-862ed69ffd03', '70eec3d4-8812-44a0-af68-ef4c0c2155ee', 'f989b15a-dad8-4c9d-9d8c-81cebdacc0a7', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('19f45a31-2deb-4f38-be30-beec4e264004', '95328b8e-7388-4647-b61b-71385996396b', 'd3b6944d-f087-4771-b138-0585974bbc24', 'fdad0ed1-5d48-4c28-a2a2-aad06109ad6a', 'a7897242-32f5-4761-a3b8-88e027da691e', 'e316fac9-4d19-4eff-b8f8-8176d1b255a2', '7a059b28-2335-4555-adb3-9ca23d7bf9fd', 5459, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('4981eacf-b853-4e0c-964f-31f55686c82d', '95328b8e-7388-4647-b61b-71385996396b', 'd3b6944d-f087-4771-b138-0585974bbc24', 'fdad0ed1-5d48-4c28-a2a2-aad06109ad6a', 'a7897242-32f5-4761-a3b8-88e027da691e', '127f1ffb-edd6-43fd-88c9-6f87b902bcff', '7a059b28-2335-4555-adb3-9ca23d7bf9fd', 44541, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('8a0e1dc1-b34c-4501-b4e7-194cdceba9c6', '96032809-6dc8-4b3e-8af7-189c0dd6005d', '6a66b3f2-e2ca-4432-a0ea-6e55a8e85667', '24d8c7ee-e44c-48c9-ad42-e76b0691fb3c', '92b5f9e0-649b-46a8-8ab7-f66ec55916e6', '7e3a0d48-2ce5-4685-bdd0-a5f7aa6c8945', '39bcb14d-5c08-4dc6-8dcf-177ca08ca248', 47500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('648f080b-b30d-44eb-8b58-3eb5d708f7dc', '96032809-6dc8-4b3e-8af7-189c0dd6005d', '6a66b3f2-e2ca-4432-a0ea-6e55a8e85667', '24d8c7ee-e44c-48c9-ad42-e76b0691fb3c', '92b5f9e0-649b-46a8-8ab7-f66ec55916e6', 'b000698d-0622-475a-9731-ae14e9dffd86', '39bcb14d-5c08-4dc6-8dcf-177ca08ca248', 2500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('3c7e72d7-9c1b-456d-acc6-b1ce9bb38204', '9cf11225-9c66-473f-9036-a32509a8b7af', '511e6d3f-88b2-4759-827a-dac208090b29', 'e25af0ac-76a9-4d85-afe7-6cd702543852', '603aa926-35cd-4a99-92cb-fdbb9f8434c3', '5d0e55bb-b29a-4a1a-a56e-83e5611313ba', '1d8c4e25-21bd-4bc7-93df-86c6f61ca2f6', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('34fa6cd8-dd42-4f60-8b1f-5b39c4f11d8a', '9cf11225-9c66-473f-9036-a32509a8b7af', '511e6d3f-88b2-4759-827a-dac208090b29', 'e25af0ac-76a9-4d85-afe7-6cd702543852', '603aa926-35cd-4a99-92cb-fdbb9f8434c3', '2be2cea1-b472-4196-8875-21f76587d45c', '1d8c4e25-21bd-4bc7-93df-86c6f61ca2f6', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('34af45b5-1681-4204-8518-412df9453b9b', 'a290dbba-e773-4818-af09-c19a1e456d5f', '0d7e889c-0c45-4cf4-bc01-7dcf30e92ce5', 'd9a35cf3-ad49-4ea4-9c24-fb3663c8d3ab', 'f2607f38-a2bc-4a52-aeac-83b562f34ca3', '5637a5e4-1f1a-4fcc-8dbe-25ec1ac83c75', 'f1fb67c7-6db5-490d-a996-5edc27210e6e', 2778, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('4eea573b-361d-4b7c-a23b-103381acb75a', 'a290dbba-e773-4818-af09-c19a1e456d5f', '0d7e889c-0c45-4cf4-bc01-7dcf30e92ce5', 'd9a35cf3-ad49-4ea4-9c24-fb3663c8d3ab', 'f2607f38-a2bc-4a52-aeac-83b562f34ca3', 'f7325663-680d-4594-8164-76e2f4f6dcf4', 'f1fb67c7-6db5-490d-a996-5edc27210e6e', 47222, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('d61179d7-79ad-4c4f-8e7e-37bb1e957dba', 'a4065bad-e57b-4f6b-9de8-3da67de681aa', '08d86274-d1ae-417d-8bf6-153d695743b6', '34ccb211-128e-4ed9-9d87-de5e04659eb6', '512952b3-88cc-4914-bbac-5d5c3229ee5d', '134d4de5-0dfd-4e16-ad71-7eca5d9ff97a', '48153367-dd36-47bb-beb1-133baa86fbdb', 4762, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('bb1e6719-fbeb-434c-bec7-5e6e6eaef124', 'a4065bad-e57b-4f6b-9de8-3da67de681aa', '08d86274-d1ae-417d-8bf6-153d695743b6', '34ccb211-128e-4ed9-9d87-de5e04659eb6', '512952b3-88cc-4914-bbac-5d5c3229ee5d', '16e12613-8c9b-4121-a70d-bcb546d2fb28', '48153367-dd36-47bb-beb1-133baa86fbdb', 45238, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('09910446-d56b-4894-9c03-4e7a32ed6702', 'a442e43f-9ffd-43a1-b08f-f2c1b78ac579', '0599d336-7037-4730-b094-91f22af80e1f', 'b073343c-6db0-45db-9ef4-27c378501af1', '7c6e91b4-b689-4dc7-b001-7219e52a3f9a', 'd6ce0380-541b-4c6d-9879-a7685c1f5f4f', 'b3551930-168b-45d8-a5c1-4e7dc26530f1', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ad2c9a13-fb03-46a4-ac79-a74b10f99755', 'a442e43f-9ffd-43a1-b08f-f2c1b78ac579', '0599d336-7037-4730-b094-91f22af80e1f', 'b073343c-6db0-45db-9ef4-27c378501af1', '7c6e91b4-b689-4dc7-b001-7219e52a3f9a', '5a25d81e-b0e5-4a63-9a5b-0f9cb01afe99', 'b3551930-168b-45d8-a5c1-4e7dc26530f1', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('dff80d6c-8f50-4ce1-adbc-3f05430d28f2', 'b130cadd-54cb-49e6-bfc0-96998f24354d', '9fde7d1e-3e67-4dd7-a2de-7a44104a7c90', '0007fc38-9592-450a-95bc-84826f23bac7', '7b19890e-c10d-4cac-97fb-ab0996789d14', 'cf1f19ab-d4ac-4ffb-93f8-c613ea571278', 'c826e39e-2dc5-4c4b-bc77-61b8bcfb4e14', 4831, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('cde6645d-270c-4146-9ecf-d8ad8bfee88a', 'b130cadd-54cb-49e6-bfc0-96998f24354d', '9fde7d1e-3e67-4dd7-a2de-7a44104a7c90', '0007fc38-9592-450a-95bc-84826f23bac7', '7b19890e-c10d-4cac-97fb-ab0996789d14', 'd193b691-6116-46d9-a9ae-6de8e6e0db60', 'c826e39e-2dc5-4c4b-bc77-61b8bcfb4e14', 45169, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('1e199933-4352-4537-a561-fdafc4cc37e8', 'b3fb2f2c-981c-404b-b0a7-0a60105afae1', '67983a10-e00a-49f2-8c68-cc43d6cff39b', '5628652d-dac5-4641-85c4-031d567ec674', '5ec993c4-472a-4114-88ef-bae1ef0c726f', 'f2045828-415f-4659-be33-c8bba0e7459c', '774266ca-95f5-4ace-9ded-c9b6b1a9ad52', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f0217699-528d-4483-8bd2-743a9586e8a6', 'b3fb2f2c-981c-404b-b0a7-0a60105afae1', '67983a10-e00a-49f2-8c68-cc43d6cff39b', '5628652d-dac5-4641-85c4-031d567ec674', '5ec993c4-472a-4114-88ef-bae1ef0c726f', 'fceab0ce-72df-4666-bd5c-2290f46537da', '774266ca-95f5-4ace-9ded-c9b6b1a9ad52', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('05550a83-3dce-4c98-8ca9-0f81556283b2', 'b854c4b0-fe3e-4d1b-a401-bf4451bfb20c', 'c7c1da47-58c8-4131-bab5-7c096b638e40', '89a25b09-46c5-4a5d-aad0-363e41b34151', 'b5ea2639-efba-4ebc-a8e2-ec964fa677bc', 'f16ed17e-f647-4840-bfef-87efa0ed84c8', '95929481-61b5-4279-90be-2991b58ba57c', 47561, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('76d135b0-ab98-422f-a409-ff903ddb98f3', 'b854c4b0-fe3e-4d1b-a401-bf4451bfb20c', 'c7c1da47-58c8-4131-bab5-7c096b638e40', '89a25b09-46c5-4a5d-aad0-363e41b34151', 'b5ea2639-efba-4ebc-a8e2-ec964fa677bc', '840f51f1-aa1c-47e0-9173-bfe2c3faf5b9', '95929481-61b5-4279-90be-2991b58ba57c', 2439, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('b0092952-37e9-4c04-be7d-3546d71ce6b0', 'ba23276b-4de6-4cab-930f-4fc6f0301921', '8b67d6d2-b907-4b92-8c1a-18e481ff3a8c', '753e8aca-79bb-420e-b8fa-5c9a19fa1f85', '6f396598-926e-41f1-be17-e286e6b101a8', '09150bdb-25ea-497c-a674-671949e76bb8', '28f07fe2-ca80-4d63-a797-7f3b9743332c', 1471, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('22160447-31df-4546-8410-52b826eb8b37', 'ba23276b-4de6-4cab-930f-4fc6f0301921', '8b67d6d2-b907-4b92-8c1a-18e481ff3a8c', '753e8aca-79bb-420e-b8fa-5c9a19fa1f85', '6f396598-926e-41f1-be17-e286e6b101a8', 'd45aeb93-ef98-47c8-a5f5-d60dfa65a30b', '28f07fe2-ca80-4d63-a797-7f3b9743332c', 48529, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ff41a5f7-fb1a-4232-9052-ccc665e4e34a', 'bb63aadd-56c8-4df1-8367-6e5426f1c3ee', '068919ce-f593-4d60-9c47-032797e0a3b5', '142528a1-c0f0-46aa-815d-2abdbf602058', 'a5184cd4-3029-4bad-a514-3ccf83f07353', '787dd778-422a-4ce0-a2ca-df96ebc32a08', 'b0ac8d3b-cef4-4833-bcb7-588da1616a10', 45349, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('3027b0f7-9760-4fca-a5ec-324b66adb01f', 'bb63aadd-56c8-4df1-8367-6e5426f1c3ee', '068919ce-f593-4d60-9c47-032797e0a3b5', '142528a1-c0f0-46aa-815d-2abdbf602058', 'a5184cd4-3029-4bad-a514-3ccf83f07353', '3dfe674b-b8d2-4952-9f49-fc1868b0040a', 'b0ac8d3b-cef4-4833-bcb7-588da1616a10', 4651, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('00e66bd1-d42f-4a4c-a860-047c45d10177', 'c3711f03-7ab4-4f16-8e4b-e874bf103ea4', 'c8c925af-d1ec-4a00-aace-93dc5097b91b', '9d00c4a1-bf4d-4017-aa0c-f67190e45db3', '1649fd41-9f43-4b33-a8f6-0a6bb3fd5bfd', 'af8e56a5-1ac2-4c22-a954-154c5bd10470', '3a4cbf83-72d9-4e2e-95e4-8951d8bcf183', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('aa234ad8-2c08-4a1a-aaa1-badfaec504c3', 'c3711f03-7ab4-4f16-8e4b-e874bf103ea4', 'c8c925af-d1ec-4a00-aace-93dc5097b91b', '9d00c4a1-bf4d-4017-aa0c-f67190e45db3', '1649fd41-9f43-4b33-a8f6-0a6bb3fd5bfd', '8d344199-4b09-4122-ae6d-20de66f166d1', '3a4cbf83-72d9-4e2e-95e4-8951d8bcf183', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('1c2baa0d-c215-47a0-8b6e-9023b57e9b46', 'c5118170-1856-4184-8dd0-93c48ba868c3', '5ed19590-b210-4861-8f2a-87ff0e8a5a80', '6360e1f4-6ed4-4522-80bf-36fea4975bb3', 'e7215208-52e1-47c5-86cb-2c57b668c66c', 'c43a7cf3-fa97-4cac-9887-fbbba8ed65a7', '71dcc3d6-eb15-454a-88c0-a645d2c6b52b', 2778, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e0947908-41ab-4f87-90c1-36a3c81bb151', 'c5118170-1856-4184-8dd0-93c48ba868c3', '5ed19590-b210-4861-8f2a-87ff0e8a5a80', '6360e1f4-6ed4-4522-80bf-36fea4975bb3', 'e7215208-52e1-47c5-86cb-2c57b668c66c', '01f94ebc-c761-4790-b0ab-9586425ca150', '71dcc3d6-eb15-454a-88c0-a645d2c6b52b', 47222, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('cfae2cc4-adac-4bf4-b8cc-abd5bbfec4bb', 'cdfc05dc-a7c1-4d3b-a726-da52f079ffc4', '5a008425-c8d5-475f-a1b1-173447b0f00d', '6fc43823-538b-4b36-9a61-fdd3c90b264f', 'd9eabd66-6f7b-49c0-b9a6-207d8fb26d53', '407cfe18-cfee-4397-88f9-00daf8b3891d', '624138e3-6e68-4002-8ad5-2d5ffe293838', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('b89ea016-3221-4936-b347-96338c153dcb', 'cdfc05dc-a7c1-4d3b-a726-da52f079ffc4', '5a008425-c8d5-475f-a1b1-173447b0f00d', '6fc43823-538b-4b36-9a61-fdd3c90b264f', 'd9eabd66-6f7b-49c0-b9a6-207d8fb26d53', 'd1e0b25d-9d70-4fd5-8a46-047d1dd3da09', '624138e3-6e68-4002-8ad5-2d5ffe293838', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('3eeaafcd-fd11-4756-b5e1-73616eb9360d', 'd1266191-53ff-46f0-8905-77a875c7cdf5', 'e4b1121f-7689-4b3e-acb8-06a9495fb541', 'cba01145-a114-468f-9b20-b68926e18956', 'a0273829-b997-4765-81fd-6953a7c2ba4f', '9641634b-d40a-4387-8401-0606b27f6ce2', '664a1939-69ad-4434-91b6-f84bba49b070', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('7e75d5b2-cf85-47f7-861a-616e96e4945d', 'd1266191-53ff-46f0-8905-77a875c7cdf5', 'e4b1121f-7689-4b3e-acb8-06a9495fb541', 'cba01145-a114-468f-9b20-b68926e18956', 'a0273829-b997-4765-81fd-6953a7c2ba4f', 'b67b017b-6c08-463b-8ce1-4a6adde1b3b3', '664a1939-69ad-4434-91b6-f84bba49b070', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('3fdb78bb-65bc-4348-85d6-d5bb9aa1c9b2', 'd3d4b28b-a52b-4afe-82c0-1c5da58d71ba', '1f4a5772-bdda-4f1f-83af-85ce0ac7e0b1', '902929f5-bec7-4c6f-a56a-e534538be645', '72643c9c-98f1-437c-8619-b6756b7b47a7', '69f58b36-b400-40c3-b93b-f44c15b5aa82', 'b392931c-aaa5-40b3-b426-9a5cdb28d0e5', 44737, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e1a3f521-da47-4ce5-a2d9-1560fc2ecff6', 'd3d4b28b-a52b-4afe-82c0-1c5da58d71ba', '1f4a5772-bdda-4f1f-83af-85ce0ac7e0b1', '902929f5-bec7-4c6f-a56a-e534538be645', '72643c9c-98f1-437c-8619-b6756b7b47a7', 'cb56dcba-b68f-4207-a644-2ae00c965d70', 'b392931c-aaa5-40b3-b426-9a5cdb28d0e5', 5263, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('6614011c-e6ca-4a34-8a61-c99f1362622a', 'd8a3d9c8-e242-41e0-9a75-d8734d9af211', '0a7571b8-6be6-4e5a-9c8d-a10d13d6611d', 'e3bc974a-8119-44d7-bf6a-731b48fca3dc', '22f946f1-6dec-4679-bb88-0de7589eb1c9', '08694f98-d8f7-4e8c-b042-32ce82487cdb', '34a269d8-5eda-4d08-a668-dda9ae0957f7', 42308, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('dd1e5ea2-2c9b-4f95-be14-be08feaa3c44', 'd8a3d9c8-e242-41e0-9a75-d8734d9af211', '0a7571b8-6be6-4e5a-9c8d-a10d13d6611d', 'e3bc974a-8119-44d7-bf6a-731b48fca3dc', '22f946f1-6dec-4679-bb88-0de7589eb1c9', '9196576f-007f-4329-bc4a-337ede3cee75', '34a269d8-5eda-4d08-a668-dda9ae0957f7', 7692, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('de98314a-c7a8-46a6-adf7-b062144bfe9f', 'e19917f8-dd45-4061-8803-ec83cabe1a46', '6f8dc711-9c7b-4068-8b5e-523c55fda200', '31af30cb-1b46-4bec-b8c8-4741aa2422b6', '10e53263-3336-47ec-af46-acb45a1c1d9d', '42a531a8-87d9-4c9c-9205-123e4c0f5617', 'e9479046-8eee-4e91-9c28-897b3123039e', 5459, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c8bf9810-f252-47fa-a358-b62783408eca', 'e19917f8-dd45-4061-8803-ec83cabe1a46', '6f8dc711-9c7b-4068-8b5e-523c55fda200', '31af30cb-1b46-4bec-b8c8-4741aa2422b6', '10e53263-3336-47ec-af46-acb45a1c1d9d', '7587a27e-81ff-47be-8234-54845a5f4d9b', 'e9479046-8eee-4e91-9c28-897b3123039e', 44541, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c9cea3f6-f03b-4cc5-8709-0eda51a1457f', 'e4fe18e8-4d47-4bbe-880a-0a13dd0787c5', 'c6d9769a-a3b1-4795-97c3-00f8094d119f', '7cf838bd-4ed4-43c7-bd9f-a8bde0e5772b', 'c39ab092-aa3e-4296-89ef-bddbe0fddbb2', '824e457c-7e9d-4e7e-9114-2011423783fd', '6a970e88-9bd7-47d7-b4f4-a252c300a05e', 47500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e108736d-762c-44ca-9a9f-de3ae1a30905', 'e4fe18e8-4d47-4bbe-880a-0a13dd0787c5', 'c6d9769a-a3b1-4795-97c3-00f8094d119f', '7cf838bd-4ed4-43c7-bd9f-a8bde0e5772b', 'c39ab092-aa3e-4296-89ef-bddbe0fddbb2', '9e0761c7-4ecb-4c74-a16b-44f35bd5bf72', '6a970e88-9bd7-47d7-b4f4-a252c300a05e', 2500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('15083474-2e65-4683-8151-ccec39fde882', 'e9839eb5-951f-49e1-92e0-ef6f16c55de9', '0f7425bd-681b-48b1-b355-be5707b942a8', 'a7fffc9c-7e8c-4c03-a2b8-4dad06a932b1', '712508b3-e440-40dc-8fbf-3867e0633fda', '52299114-d6f1-4b03-b312-b76ec3011854', 'd41f14d4-2e64-48ad-a777-5112b1c8694f', 1471, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('9784e6f2-02c0-4008-ab36-a946128095b2', 'e9839eb5-951f-49e1-92e0-ef6f16c55de9', '0f7425bd-681b-48b1-b355-be5707b942a8', 'a7fffc9c-7e8c-4c03-a2b8-4dad06a932b1', '712508b3-e440-40dc-8fbf-3867e0633fda', '4e815d38-736c-4d87-9da0-12b69e8304ce', 'd41f14d4-2e64-48ad-a777-5112b1c8694f', 48529, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a543db28-8336-47e5-86dc-5aea3c09f496', 'f2e1f1a1-4390-4fe0-8fe7-379a31fc613d', '71206642-5372-43f1-a1fd-cce530d3bca5', '7125a279-b08b-4b2a-84e7-6fcaacf6b93b', '3a205d13-7dd5-4cd9-a7f0-7f757507bd17', 'bcd9bb43-cc2d-44e1-ba86-b80e76b25c59', 'ddeff611-6def-4a90-8b85-a83d370d7222', 4717, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('5623abb3-273f-4428-a1bd-6576e6c13a36', 'f2e1f1a1-4390-4fe0-8fe7-379a31fc613d', '71206642-5372-43f1-a1fd-cce530d3bca5', '7125a279-b08b-4b2a-84e7-6fcaacf6b93b', '3a205d13-7dd5-4cd9-a7f0-7f757507bd17', 'e99be471-e813-476f-bfe3-fbdb2952fa5f', 'ddeff611-6def-4a90-8b85-a83d370d7222', 45283, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('2bfb2823-3755-4d51-a0de-10731f6c57a3', 'f6b0857c-24a7-44f0-b6e7-8563ef56f31a', '425ba88f-09d7-4fe5-98b3-51fb3ef52d60', 'e3dfcd03-96a0-478e-9110-fc06cfce48eb', 'a2215e01-b6e6-4e04-a522-08f7c8c08200', '5c82e20a-fb67-4484-afe8-7a4c0b2a96a5', 'fc9f196e-985e-46ba-ba10-f7135a767a1a', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fe70ca46-ec8e-4a79-ad47-d08f58bbbecc', 'f6b0857c-24a7-44f0-b6e7-8563ef56f31a', '425ba88f-09d7-4fe5-98b3-51fb3ef52d60', 'e3dfcd03-96a0-478e-9110-fc06cfce48eb', 'a2215e01-b6e6-4e04-a522-08f7c8c08200', '0f35276d-530f-4adc-9243-be3f6078bdba', 'fc9f196e-985e-46ba-ba10-f7135a767a1a', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('bf1da15a-af38-4aaa-bd08-b697ad84b0e2', 'fb019667-2add-4e1f-9613-9cf72cdf51ba', '8bab1bd9-0732-40b1-92cd-2f2a699e8751', 'ba91241e-e147-476f-b367-331dda94b59f', '3fd1b964-4622-4bd3-8036-9e5b253415a8', '0d321893-2cf0-4cb0-9017-ff9272076a8e', '50dde977-cbc5-4c04-9c1a-74ebb59dc0c1', 1471, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ee7cd48d-d19b-453d-83aa-0a7fb61a8a75', 'fb019667-2add-4e1f-9613-9cf72cdf51ba', '8bab1bd9-0732-40b1-92cd-2f2a699e8751', 'ba91241e-e147-476f-b367-331dda94b59f', '3fd1b964-4622-4bd3-8036-9e5b253415a8', '444297f8-39c1-4867-ae0b-5f06700cfa36', '50dde977-cbc5-4c04-9c1a-74ebb59dc0c1', 48529, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('5097fa09-4b14-4adf-8ec8-f9a96ac00e45', 'fde347f8-f8ca-4def-b039-7c38272d389a', 'b8342df5-431d-43f8-8216-3a97491b991c', 'cdeba822-bcc5-4058-9944-d941f6daedf1', '21fd2be9-06ad-4d23-9485-45b1358cf2ef', '6d8b756b-bfa2-4f22-a4be-d5e1970fc90a', '085dab55-7e34-4749-884a-761f1c95fde6', 47561, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f093bd16-495d-427b-a16c-8519aff5b549', 'fde347f8-f8ca-4def-b039-7c38272d389a', 'b8342df5-431d-43f8-8216-3a97491b991c', 'cdeba822-bcc5-4058-9944-d941f6daedf1', '21fd2be9-06ad-4d23-9485-45b1358cf2ef', '1119e711-e51e-4cb5-9f2f-c97beeb7dd48', '085dab55-7e34-4749-884a-761f1c95fde6', 2439, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('21e3d2bf-5adb-49e6-82fb-a92aa98b334f', '00c23dc0-c35e-432f-848c-f9a4e098d8f5', 'd3b6944d-f087-4771-b138-0585974bbc24', 'fdad0ed1-5d48-4c28-a2a2-aad06109ad6a', 'a7897242-32f5-4761-a3b8-88e027da691e', '127f1ffb-edd6-43fd-88c9-6f87b902bcff', 'bf8acd99-9791-4ba6-a193-5da58475ffb3', 96210, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('afc1fd62-4f94-4748-afc4-bc4131d3f2ff', '00c23dc0-c35e-432f-848c-f9a4e098d8f5', 'd3b6944d-f087-4771-b138-0585974bbc24', 'fdad0ed1-5d48-4c28-a2a2-aad06109ad6a', 'a7897242-32f5-4761-a3b8-88e027da691e', 'e316fac9-4d19-4eff-b8f8-8176d1b255a2', 'bf8acd99-9791-4ba6-a193-5da58475ffb3', 11790, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('95614dd2-31f8-4dc5-8d87-9185e8e5eb58', '1963bcd0-9896-491f-98dd-afdf68b6252d', '56c03081-7481-41d7-9429-5ccf19a7e722', 'eb4a8b4d-33b2-4224-831a-d26c3a5dbf93', '99ce326b-9ffb-41e3-a0b1-d2e71c1723e8', 'aa637be7-df6b-45c9-9f3f-2a6cdbf2607f', '17e3575e-c16d-434a-a5b9-139f6b7c3650', 11321, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('9383e6b6-013f-4879-afd7-9d1ad1897b24', '1963bcd0-9896-491f-98dd-afdf68b6252d', '56c03081-7481-41d7-9429-5ccf19a7e722', 'eb4a8b4d-33b2-4224-831a-d26c3a5dbf93', '99ce326b-9ffb-41e3-a0b1-d2e71c1723e8', '493ba449-c796-422f-a293-7ce65579a8c4', '17e3575e-c16d-434a-a5b9-139f6b7c3650', 108679, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fe9dcd66-8588-49ef-a6aa-0f78e99ffece', '308aa706-c943-42ce-9bb3-e25e86b5662c', '71206642-5372-43f1-a1fd-cce530d3bca5', '7125a279-b08b-4b2a-84e7-6fcaacf6b93b', '3a205d13-7dd5-4cd9-a7f0-7f757507bd17', 'bcd9bb43-cc2d-44e1-ba86-b80e76b25c59', '232ce517-9c09-42ac-ae3b-3b705b1ea5d5', 11321, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f049656b-f5be-48c0-823e-f16c0f960034', '308aa706-c943-42ce-9bb3-e25e86b5662c', '71206642-5372-43f1-a1fd-cce530d3bca5', '7125a279-b08b-4b2a-84e7-6fcaacf6b93b', '3a205d13-7dd5-4cd9-a7f0-7f757507bd17', 'e99be471-e813-476f-bfe3-fbdb2952fa5f', '232ce517-9c09-42ac-ae3b-3b705b1ea5d5', 108679, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e7000872-2ce3-4b4c-a4ca-883c1ebdefae', '308aa706-c943-42ce-9bb3-e25e86b5662c', '71206642-5372-43f1-a1fd-cce530d3bca5', '7125a279-b08b-4b2a-84e7-6fcaacf6b93b', '3a205d13-7dd5-4cd9-a7f0-7f757507bd17', 'bcd9bb43-cc2d-44e1-ba86-b80e76b25c59', 'd422ac89-bcfa-4474-89a8-57c0eb8daeb6', 3774, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('9259f73b-8296-4631-a75e-943cdb3b2949', '308aa706-c943-42ce-9bb3-e25e86b5662c', '71206642-5372-43f1-a1fd-cce530d3bca5', '7125a279-b08b-4b2a-84e7-6fcaacf6b93b', '3a205d13-7dd5-4cd9-a7f0-7f757507bd17', 'e99be471-e813-476f-bfe3-fbdb2952fa5f', 'd422ac89-bcfa-4474-89a8-57c0eb8daeb6', 36226, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e0cc995a-0c4d-4b63-af26-4875ebd09970', '80295975-2de1-4e0c-bdea-0548a00887da', '5a008425-c8d5-475f-a1b1-173447b0f00d', '6fc43823-538b-4b36-9a61-fdd3c90b264f', 'd9eabd66-6f7b-49c0-b9a6-207d8fb26d53', 'd1e0b25d-9d70-4fd5-8a46-047d1dd3da09', '1c262ba6-f23f-4656-8f1b-48f415fc3d32', 126042, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('88b739b7-9272-4603-aee5-2600621d74c2', '80295975-2de1-4e0c-bdea-0548a00887da', '5a008425-c8d5-475f-a1b1-173447b0f00d', '6fc43823-538b-4b36-9a61-fdd3c90b264f', 'd9eabd66-6f7b-49c0-b9a6-207d8fb26d53', '407cfe18-cfee-4397-88f9-00daf8b3891d', '1c262ba6-f23f-4656-8f1b-48f415fc3d32', 11458, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('bb7fb102-6167-42f2-bc76-9d7866184f15', '80295975-2de1-4e0c-bdea-0548a00887da', '5a008425-c8d5-475f-a1b1-173447b0f00d', '6fc43823-538b-4b36-9a61-fdd3c90b264f', 'd9eabd66-6f7b-49c0-b9a6-207d8fb26d53', 'd1e0b25d-9d70-4fd5-8a46-047d1dd3da09', '8a8f7fe1-9aaa-404a-94a8-728205c52d82', 126042, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('7a9560ba-b346-4b24-920b-7c7388b260f1', '80295975-2de1-4e0c-bdea-0548a00887da', '5a008425-c8d5-475f-a1b1-173447b0f00d', '6fc43823-538b-4b36-9a61-fdd3c90b264f', 'd9eabd66-6f7b-49c0-b9a6-207d8fb26d53', '407cfe18-cfee-4397-88f9-00daf8b3891d', '8a8f7fe1-9aaa-404a-94a8-728205c52d82', 11458, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('662d8cbd-e524-46b0-acf4-75c36ea1357b', '80295975-2de1-4e0c-bdea-0548a00887da', '5a008425-c8d5-475f-a1b1-173447b0f00d', '6fc43823-538b-4b36-9a61-fdd3c90b264f', 'd9eabd66-6f7b-49c0-b9a6-207d8fb26d53', 'd1e0b25d-9d70-4fd5-8a46-047d1dd3da09', 'b8ed24e7-b43f-484f-89b8-973fa984338a', 22917, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('dc5da919-41e1-4bae-bca4-93a8407e6d89', '80295975-2de1-4e0c-bdea-0548a00887da', '5a008425-c8d5-475f-a1b1-173447b0f00d', '6fc43823-538b-4b36-9a61-fdd3c90b264f', 'd9eabd66-6f7b-49c0-b9a6-207d8fb26d53', '407cfe18-cfee-4397-88f9-00daf8b3891d', 'b8ed24e7-b43f-484f-89b8-973fa984338a', 2083, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('cf7beb8f-3403-4c94-9c8e-70c5230f4058', '9024dec7-5675-4b4d-b272-eb60267a4443', '62b5eebd-30c9-4ea5-9571-45ac97d195a3', 'c2fbb491-8204-41eb-ab67-30ad8a8d87c4', 'd5b6806b-3933-44e7-bdfb-b91103def9f4', 'd2b93719-84ca-4ce4-9de0-d291d90c866c', '59c768b9-f123-417d-8149-1b4d222d045b', 11250, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('0b0c3c79-c78e-489d-b9fa-ff0a4b5228ae', '9024dec7-5675-4b4d-b272-eb60267a4443', '62b5eebd-30c9-4ea5-9571-45ac97d195a3', 'c2fbb491-8204-41eb-ab67-30ad8a8d87c4', 'd5b6806b-3933-44e7-bdfb-b91103def9f4', '4a54a37c-2cf0-4b7a-8152-f4638b954fd3', '59c768b9-f123-417d-8149-1b4d222d045b', 123750, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('eb096b4e-c63d-4862-9b7d-60b81ac4d1c1', 'dc55aef6-ee6b-4769-adde-be6f99b9189c', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '21253ad8-f9f5-44ac-b694-73e39dc773a6', 'b1ca3992-f5b6-4f04-859b-f9966495ad52', 4167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('6af79078-8f9c-4389-a62d-88ccec20fe94', 'dc55aef6-ee6b-4769-adde-be6f99b9189c', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '262e49de-ac52-4b6f-9ab2-bd2d8494a771', 'b1ca3992-f5b6-4f04-859b-f9966495ad52', 45833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('42008eab-873c-47d0-b087-40b4d2f4a8d6', 'dc55aef6-ee6b-4769-adde-be6f99b9189c', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '262e49de-ac52-4b6f-9ab2-bd2d8494a771', 'd36e136a-608a-4c69-8e31-3e7a499e9063', 126042, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('046abe5b-41cc-4ae9-886d-b134cb08017e', 'dc55aef6-ee6b-4769-adde-be6f99b9189c', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '21253ad8-f9f5-44ac-b694-73e39dc773a6', 'd36e136a-608a-4c69-8e31-3e7a499e9063', 11458, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('abfde721-7eb4-40b6-8345-2dfb866d2ffb', 'dc55aef6-ee6b-4769-adde-be6f99b9189c', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '21253ad8-f9f5-44ac-b694-73e39dc773a6', 'a6645218-1bcb-43e1-89d0-0e084b6c8c36', 1042, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('4b4c46d4-f7f6-441a-af42-b0333234513c', 'dc55aef6-ee6b-4769-adde-be6f99b9189c', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '262e49de-ac52-4b6f-9ab2-bd2d8494a771', 'a6645218-1bcb-43e1-89d0-0e084b6c8c36', 11458, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fc8a5115-2ae9-4fc2-9b6a-5f76879a0f25', '06827c45-63ad-4ab0-a741-b6c4fa3581e2', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '21253ad8-f9f5-44ac-b694-73e39dc773a6', 'a6645218-1bcb-43e1-89d0-0e084b6c8c36', 10417, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('1a983da3-08b9-4cae-8081-ea1377cea50d', '06827c45-63ad-4ab0-a741-b6c4fa3581e2', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '262e49de-ac52-4b6f-9ab2-bd2d8494a771', 'a6645218-1bcb-43e1-89d0-0e084b6c8c36', 114583, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('7df3a48b-f66a-4596-b042-31bcf9327ac0', '06827c45-63ad-4ab0-a741-b6c4fa3581e2', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '21253ad8-f9f5-44ac-b694-73e39dc773a6', '272d8a0e-1976-47b1-9c60-ac606c947f38', 6250, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('4551d978-1945-4d2d-9181-d67c7c210f50', '06827c45-63ad-4ab0-a741-b6c4fa3581e2', 'e8f7d49f-551c-4d80-acf9-9e81c06a264b', '019a8a66-bc15-4de2-b501-37e57f4d35c7', 'eecba3b3-2ee4-40a7-b7c6-be660eed4929', '262e49de-ac52-4b6f-9ab2-bd2d8494a771', '272d8a0e-1976-47b1-9c60-ac606c947f38', 68750, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c559eb4c-18f3-4766-87c2-adb7a50087d0', '073e4f24-bbd9-4363-9e5b-17133821b064', 'c53d3c95-39d8-48fe-a984-7004bce4a387', 'b069cae4-baf8-45d7-a303-f97fea921f61', '0599c9d9-39e9-42bb-a6ee-aebd5cdd1336', '2819c432-5a80-40a1-b51a-49ec28cf809a', 'b447fb32-39ad-4b2b-a658-e1ac662d83b2', 47500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('7b314e8a-82d9-427f-8d41-f500fd1d79a6', '073e4f24-bbd9-4363-9e5b-17133821b064', 'c53d3c95-39d8-48fe-a984-7004bce4a387', 'b069cae4-baf8-45d7-a303-f97fea921f61', '0599c9d9-39e9-42bb-a6ee-aebd5cdd1336', '70341468-6842-4242-9216-81eaea96e886', 'b447fb32-39ad-4b2b-a658-e1ac662d83b2', 2500, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('449878bf-1294-4175-8d89-0ff74720b1a4', '0b407d17-3571-42bd-81d9-5e1cd5afecaf', '1fedda40-1001-4fce-9304-4051f8a8a048', '06433f7e-a87a-4b1e-ade3-01b2f2455b13', 'af146945-040c-4a22-9f7b-9cc7e3ba3f86', '4a95c1dd-db1f-42ba-9bd3-38d2de536c99', '4e9e70b3-7d78-4283-9437-ec9f8f1b6d92', 21154, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('133e741e-6b40-43c8-9915-79ff983ad1c3', '0b407d17-3571-42bd-81d9-5e1cd5afecaf', '1fedda40-1001-4fce-9304-4051f8a8a048', '06433f7e-a87a-4b1e-ade3-01b2f2455b13', 'af146945-040c-4a22-9f7b-9cc7e3ba3f86', '85b7b96d-3617-4778-840e-cb8fabb55cee', '4e9e70b3-7d78-4283-9437-ec9f8f1b6d92', 116346, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('35fbdbd1-01b8-4fe0-9739-f7db07ea6eb8', '1a350102-b65e-451a-97f8-d38c352391c1', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '03d9e758-47b6-49c7-912e-1f67e8762208', '79997e3b-4c9b-4ddb-ab4f-afefd643888b', 126042, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ba0a5533-5f16-4401-b281-5eec5ee273a1', '1a350102-b65e-451a-97f8-d38c352391c1', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '64ca6be2-79f2-4611-b45c-a1f875667ccb', '79997e3b-4c9b-4ddb-ab4f-afefd643888b', 11458, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('9f5f9ffb-e1f9-4d9b-84f0-07943967d3d7', '1a350102-b65e-451a-97f8-d38c352391c1', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '03d9e758-47b6-49c7-912e-1f67e8762208', '2f2a2d58-643a-4fdb-ac23-0803b3990127', 126042, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a9d46a38-5948-446f-a7ba-91783090fcdd', '1a350102-b65e-451a-97f8-d38c352391c1', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '64ca6be2-79f2-4611-b45c-a1f875667ccb', '2f2a2d58-643a-4fdb-ac23-0803b3990127', 11458, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('8ae2cdb2-96b0-4ba0-89c6-1fbf9e659da7', '1a350102-b65e-451a-97f8-d38c352391c1', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '03d9e758-47b6-49c7-912e-1f67e8762208', '44fcd999-abaa-4db4-9b08-df72afdb91f5', 126042, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('0bc859e2-87a3-44a0-a1bf-2f4c0983b507', '1a350102-b65e-451a-97f8-d38c352391c1', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '64ca6be2-79f2-4611-b45c-a1f875667ccb', '44fcd999-abaa-4db4-9b08-df72afdb91f5', 11458, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('00d48ef1-2ef5-4a0b-8628-e03cd70bd986', '1a350102-b65e-451a-97f8-d38c352391c1', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '03d9e758-47b6-49c7-912e-1f67e8762208', '40156abc-7ec2-4bf9-95b3-c7440badba86', 126041, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('b6c5b0ed-24c7-4a8d-b07a-057c3a732cc7', '1a350102-b65e-451a-97f8-d38c352391c1', 'd02d23d2-f08e-497e-ae37-7cd9ca2df72f', 'a0229984-241f-491f-997e-00a3f1e3f3b6', '692be8a8-0935-413f-9427-3346669b136c', '64ca6be2-79f2-4611-b45c-a1f875667ccb', '40156abc-7ec2-4bf9-95b3-c7440badba86', 11459, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f0db31de-2adb-41ea-818e-c3ee0145c969', '1b6707b0-c393-45a4-b733-a3ee55415ed1', '6f8dc711-9c7b-4068-8b5e-523c55fda200', '31af30cb-1b46-4bec-b8c8-4741aa2422b6', '10e53263-3336-47ec-af46-acb45a1c1d9d', '42a531a8-87d9-4c9c-9205-123e4c0f5617', 'dd05e804-013b-4c5c-b805-e30382e0f820', 44541, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('b11ff808-7c07-4259-8f18-d7758d4df220', '1b6707b0-c393-45a4-b733-a3ee55415ed1', '6f8dc711-9c7b-4068-8b5e-523c55fda200', '31af30cb-1b46-4bec-b8c8-4741aa2422b6', '10e53263-3336-47ec-af46-acb45a1c1d9d', '7587a27e-81ff-47be-8234-54845a5f4d9b', 'dd05e804-013b-4c5c-b805-e30382e0f820', 363459, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fe6cf829-b71e-48ab-8ace-7f9a1aac866b', '20d16485-1467-4ecd-9534-e349ba860640', '425ba88f-09d7-4fe5-98b3-51fb3ef52d60', 'e3dfcd03-96a0-478e-9110-fc06cfce48eb', 'a2215e01-b6e6-4e04-a522-08f7c8c08200', '5c82e20a-fb67-4484-afe8-7a4c0b2a96a5', '3ed8ba0d-4a5a-4960-bdc9-8e913789977f', 11167, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('6c2f7ac3-5e39-4bc6-834f-40ba76263424', '20d16485-1467-4ecd-9534-e349ba860640', '425ba88f-09d7-4fe5-98b3-51fb3ef52d60', 'e3dfcd03-96a0-478e-9110-fc06cfce48eb', 'a2215e01-b6e6-4e04-a522-08f7c8c08200', '0f35276d-530f-4adc-9243-be3f6078bdba', '3ed8ba0d-4a5a-4960-bdc9-8e913789977f', 122833, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f325d621-6957-4966-bbf3-05053237ee5f', '4067493a-df1c-4655-aacc-a2e251e407f5', '15881bda-9066-4eb6-baed-ccbb7fc52f96', 'e93a49ce-4fc8-484e-b318-343381cb0de3', 'b4a2b6c9-fe4d-43ff-be4f-909e0a989d74', '1035ae4d-bf2f-4dfe-8b1a-f13eb5ccaee1', '2a996979-6da4-4a14-ab30-854ee34456dd', 11806, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c4484ca9-7880-48d0-a7e5-57f8fb4b2514', '4067493a-df1c-4655-aacc-a2e251e407f5', '15881bda-9066-4eb6-baed-ccbb7fc52f96', 'e93a49ce-4fc8-484e-b318-343381cb0de3', 'b4a2b6c9-fe4d-43ff-be4f-909e0a989d74', '907b3315-8327-47a8-b0a2-3475ecf1773a', '2a996979-6da4-4a14-ab30-854ee34456dd', 200694, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a0e57a30-0b6a-47c9-97c5-af96358b2871', '4067493a-df1c-4655-aacc-a2e251e407f5', '15881bda-9066-4eb6-baed-ccbb7fc52f96', 'e93a49ce-4fc8-484e-b318-343381cb0de3', 'b4a2b6c9-fe4d-43ff-be4f-909e0a989d74', '907b3315-8327-47a8-b0a2-3475ecf1773a', '31a36886-f285-48c1-8dd1-8feeea54a12d', 35417, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('1067432b-d128-4ee5-8644-42623ba02e18', '4067493a-df1c-4655-aacc-a2e251e407f5', '15881bda-9066-4eb6-baed-ccbb7fc52f96', 'e93a49ce-4fc8-484e-b318-343381cb0de3', 'b4a2b6c9-fe4d-43ff-be4f-909e0a989d74', '1035ae4d-bf2f-4dfe-8b1a-f13eb5ccaee1', '31a36886-f285-48c1-8dd1-8feeea54a12d', 2083, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fee28feb-064d-4e38-8868-111469f1ec54', '6714b8d3-9bfa-4a10-97e3-cb322b3a1f8c', '64a8ccf3-2e8c-4bad-b438-04a37edffe26', 'f22492fc-364c-49a4-93fb-cfe90f56923c', '32087164-735d-4b8f-8b6a-650eadc51a14', 'f4d43eaa-e1b2-4bcd-b433-09220d060de4', '3f41bfd8-d8d5-45b8-aaa5-9f2bf3df7148', 126042, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('13b98ac0-7b34-41e6-8b3e-8644c6caaec0', '6714b8d3-9bfa-4a10-97e3-cb322b3a1f8c', '64a8ccf3-2e8c-4bad-b438-04a37edffe26', 'f22492fc-364c-49a4-93fb-cfe90f56923c', '32087164-735d-4b8f-8b6a-650eadc51a14', '01fccd34-98d9-44c6-b6c4-dd0a94777c44', '3f41bfd8-d8d5-45b8-aaa5-9f2bf3df7148', 11458, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f9f1bc51-c31a-47fe-8bfd-c5d9cbcb7846', '6714b8d3-9bfa-4a10-97e3-cb322b3a1f8c', '64a8ccf3-2e8c-4bad-b438-04a37edffe26', 'f22492fc-364c-49a4-93fb-cfe90f56923c', '32087164-735d-4b8f-8b6a-650eadc51a14', 'f4d43eaa-e1b2-4bcd-b433-09220d060de4', 'cd9f7993-7dd7-4ccc-bde8-d34be576f859', 43542, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('18408c7b-4438-4302-b632-98ec3f9ae2cd', '6714b8d3-9bfa-4a10-97e3-cb322b3a1f8c', '64a8ccf3-2e8c-4bad-b438-04a37edffe26', 'f22492fc-364c-49a4-93fb-cfe90f56923c', '32087164-735d-4b8f-8b6a-650eadc51a14', '01fccd34-98d9-44c6-b6c4-dd0a94777c44', 'cd9f7993-7dd7-4ccc-bde8-d34be576f859', 3958, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('3865a85b-283f-40b8-9e66-b0fc90f6fd36', '6d4c9240-92be-41b2-9353-c0d0e8fd7a2f', 'c846537e-b2b4-48a6-be6b-429981df3d7b', '0e5bd0d9-fda7-40dc-b9e8-ab62549b4f43', '35c7fd10-2e1f-4d1b-86b5-e951860f5fff', 'b367d68c-b9c5-4f85-bf81-6574130e27b7', 'a8960ad9-49fc-4db3-8a2a-feeb94414b27', 4717, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('76fe7331-4be8-4824-b820-3fc949dbe220', '6d4c9240-92be-41b2-9353-c0d0e8fd7a2f', 'c846537e-b2b4-48a6-be6b-429981df3d7b', '0e5bd0d9-fda7-40dc-b9e8-ab62549b4f43', '35c7fd10-2e1f-4d1b-86b5-e951860f5fff', '216e910a-a5e3-496b-9def-5aab8af1c384', 'a8960ad9-49fc-4db3-8a2a-feeb94414b27', 45283, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('9d126bd7-6166-4d16-bf74-f6504e8f364c', '6d4c9240-92be-41b2-9353-c0d0e8fd7a2f', 'c846537e-b2b4-48a6-be6b-429981df3d7b', '0e5bd0d9-fda7-40dc-b9e8-ab62549b4f43', '35c7fd10-2e1f-4d1b-86b5-e951860f5fff', 'b367d68c-b9c5-4f85-bf81-6574130e27b7', '92d6fbb2-0efb-4dce-9f0e-08bab42008f5', 11321, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('e61a3b08-c204-4301-9acb-673bbfc24c00', '6d4c9240-92be-41b2-9353-c0d0e8fd7a2f', 'c846537e-b2b4-48a6-be6b-429981df3d7b', '0e5bd0d9-fda7-40dc-b9e8-ab62549b4f43', '35c7fd10-2e1f-4d1b-86b5-e951860f5fff', '216e910a-a5e3-496b-9def-5aab8af1c384', '92d6fbb2-0efb-4dce-9f0e-08bab42008f5', 108679, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('9ddb62a1-d9a2-4cb1-850b-6bb2ab3584a4', '6d4c9240-92be-41b2-9353-c0d0e8fd7a2f', 'c846537e-b2b4-48a6-be6b-429981df3d7b', '0e5bd0d9-fda7-40dc-b9e8-ab62549b4f43', '35c7fd10-2e1f-4d1b-86b5-e951860f5fff', 'b367d68c-b9c5-4f85-bf81-6574130e27b7', 'c36e843f-3585-4ec5-83bb-128fb8783403', 11321, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('573ca10b-416d-4eed-95d5-069fd7265ff0', '6d4c9240-92be-41b2-9353-c0d0e8fd7a2f', 'c846537e-b2b4-48a6-be6b-429981df3d7b', '0e5bd0d9-fda7-40dc-b9e8-ab62549b4f43', '35c7fd10-2e1f-4d1b-86b5-e951860f5fff', '216e910a-a5e3-496b-9def-5aab8af1c384', 'c36e843f-3585-4ec5-83bb-128fb8783403', 108679, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('be24ad5b-6fa7-4746-aead-b09da9f040a2', '6d4c9240-92be-41b2-9353-c0d0e8fd7a2f', 'c846537e-b2b4-48a6-be6b-429981df3d7b', '0e5bd0d9-fda7-40dc-b9e8-ab62549b4f43', '35c7fd10-2e1f-4d1b-86b5-e951860f5fff', 'b367d68c-b9c5-4f85-bf81-6574130e27b7', 'a020b4e1-529c-4d1e-8c9c-6c14216abdbe', 11132, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('f78db0bf-e49d-4657-a458-a75516d42b81', '6d4c9240-92be-41b2-9353-c0d0e8fd7a2f', 'c846537e-b2b4-48a6-be6b-429981df3d7b', '0e5bd0d9-fda7-40dc-b9e8-ab62549b4f43', '35c7fd10-2e1f-4d1b-86b5-e951860f5fff', '216e910a-a5e3-496b-9def-5aab8af1c384', 'a020b4e1-529c-4d1e-8c9c-6c14216abdbe', 106868, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a2dfc3c3-fe0c-4a86-9366-1a0c2816f935', '741a1acf-0800-4010-a6e1-01695883554d', '0a7571b8-6be6-4e5a-9c8d-a10d13d6611d', 'e3bc974a-8119-44d7-bf6a-731b48fca3dc', '22f946f1-6dec-4679-bb88-0de7589eb1c9', '08694f98-d8f7-4e8c-b042-32ce82487cdb', '188db274-bca1-42e6-b8a7-c7ef72795f99', 58173, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c683648e-edd6-4882-89c6-3da518cc4de0', '741a1acf-0800-4010-a6e1-01695883554d', '0a7571b8-6be6-4e5a-9c8d-a10d13d6611d', 'e3bc974a-8119-44d7-bf6a-731b48fca3dc', '22f946f1-6dec-4679-bb88-0de7589eb1c9', '9196576f-007f-4329-bc4a-337ede3cee75', '188db274-bca1-42e6-b8a7-c7ef72795f99', 10577, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('63ff417d-ea76-4b83-a4d5-73274bbbaf3f', '741a1acf-0800-4010-a6e1-01695883554d', '0a7571b8-6be6-4e5a-9c8d-a10d13d6611d', 'e3bc974a-8119-44d7-bf6a-731b48fca3dc', '22f946f1-6dec-4679-bb88-0de7589eb1c9', '9196576f-007f-4329-bc4a-337ede3cee75', '3422eb1f-08d6-40d8-8e5c-6153552fee1a', 4808, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('100efb0e-b707-42be-b7dc-b69d3da2bcd6', '741a1acf-0800-4010-a6e1-01695883554d', '0a7571b8-6be6-4e5a-9c8d-a10d13d6611d', 'e3bc974a-8119-44d7-bf6a-731b48fca3dc', '22f946f1-6dec-4679-bb88-0de7589eb1c9', '08694f98-d8f7-4e8c-b042-32ce82487cdb', '3422eb1f-08d6-40d8-8e5c-6153552fee1a', 26442, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('951d5ffc-46c0-48d2-9a9c-967d40079081', '99bb36db-f611-48d4-9d27-d37ed49955cb', 'cad20d96-e4d9-4bd5-aa8a-2bdd980513c8', 'd4d40c29-47d3-46f2-9e1e-a88c66cefaf6', '9e93fb78-f368-43f9-9a69-70ecf12558ef', '5b106ce2-0e07-42f6-bb5e-368fb9547eb0', '52669605-c4bc-4eac-9bbb-ac75f2de6060', 44879, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('4c6fe97e-28cf-4acc-9744-40b321f4e207', '99bb36db-f611-48d4-9d27-d37ed49955cb', 'cad20d96-e4d9-4bd5-aa8a-2bdd980513c8', 'd4d40c29-47d3-46f2-9e1e-a88c66cefaf6', '9e93fb78-f368-43f9-9a69-70ecf12558ef', 'f9180324-e413-4c75-99ce-eeaaa5e7febb', '52669605-c4bc-4eac-9bbb-ac75f2de6060', 393321, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ed3657bb-04ec-4717-8baa-32c4349c8eb1', 'd8c75c63-3e26-46b5-8cf9-e8d8596ac0c8', '811763d3-d530-47d0-ae2c-94a4ea8a8191', 'e03dfff6-8127-406d-898e-f94e2c369e56', 'b5762da4-5d09-4fea-943a-c8772a5f8271', 'f23bdf08-2b62-4610-bd7c-fdb9c83ab8d2', '126f64ac-bf7d-4435-98b1-4822425d8a81', 15385, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('909fedf7-d162-4561-a5e6-88a51451ef2e', 'd8c75c63-3e26-46b5-8cf9-e8d8596ac0c8', '811763d3-d530-47d0-ae2c-94a4ea8a8191', 'e03dfff6-8127-406d-898e-f94e2c369e56', 'b5762da4-5d09-4fea-943a-c8772a5f8271', 'd0511be6-0d1f-4765-ac55-787bf1e78a7e', '126f64ac-bf7d-4435-98b1-4822425d8a81', 84615, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('308ff1e4-630e-46d2-8f63-95c6c5a0ed4c', 'e75a688f-2de3-4b1c-aed2-1a65504d6dc8', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', '59fa8ec0-cb90-4230-98f3-7b1a09f7e31a', '2d37f007-3f1e-4dc1-967f-fe823c8f305d', 10577, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('7c9d2a99-6cd8-42b2-8af0-5619cd8b9742', 'e75a688f-2de3-4b1c-aed2-1a65504d6dc8', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', 'f240ace0-531e-4865-b913-a864384a3d87', '2d37f007-3f1e-4dc1-967f-fe823c8f305d', 58173, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('b721d412-1efa-4fae-8064-522d99a6a3c5', 'e75a688f-2de3-4b1c-aed2-1a65504d6dc8', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', '59fa8ec0-cb90-4230-98f3-7b1a09f7e31a', 'e4e8c8c7-d8d2-4587-8765-4651456e91b2', 10577, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('ff855726-8321-47ec-8650-dd524ef10d43', 'e75a688f-2de3-4b1c-aed2-1a65504d6dc8', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', 'f240ace0-531e-4865-b913-a864384a3d87', 'e4e8c8c7-d8d2-4587-8765-4651456e91b2', 58173, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c933d448-1e38-4422-b822-66024751a5da', 'e75a688f-2de3-4b1c-aed2-1a65504d6dc8', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', '59fa8ec0-cb90-4230-98f3-7b1a09f7e31a', '9deebd6d-d488-46f8-b4ae-b6c9d0615845', 10577, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('643b0091-9eff-4916-b489-e5283b95b0e0', 'e75a688f-2de3-4b1c-aed2-1a65504d6dc8', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', 'f240ace0-531e-4865-b913-a864384a3d87', '9deebd6d-d488-46f8-b4ae-b6c9d0615845', 58173, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('fc80322b-3057-414f-9e4c-b58e2f28009c', 'e75a688f-2de3-4b1c-aed2-1a65504d6dc8', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', '59fa8ec0-cb90-4230-98f3-7b1a09f7e31a', '4eaad1f2-61a5-45fd-9264-fb39ce22feeb', 5808, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('a98da64b-9b6d-4ae3-83eb-882b105b1bb6', 'e75a688f-2de3-4b1c-aed2-1a65504d6dc8', '2f14c029-c8d1-4463-8e73-782e0b074b85', 'fb528f0c-2cab-4019-b57b-f3838837f8cb', 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426', 'f240ace0-531e-4865-b913-a864384a3d87', '4eaad1f2-61a5-45fd-9264-fb39ce22feeb', 31942, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('7920c4a6-cdb5-4eea-bf07-f0e69529ffde', 'ecc4cf7d-ecb6-4912-9ecd-ea0f571d96ee', '7488118f-09a9-4a7b-92b3-a10ff07215be', '48fcc9cb-2034-4ce7-9c88-6af1dda03b98', '14182a57-70b2-47d6-b407-77a6c1492b2b', '9d575ae6-0e78-4124-b0fd-1977ede6c0ca', '322ae98c-b6b7-4c56-9b12-d7534b82cab4', 15741, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('60f81cb2-c29c-41c0-981b-2bbd71bb20d7', 'ecc4cf7d-ecb6-4912-9ecd-ea0f571d96ee', '7488118f-09a9-4a7b-92b3-a10ff07215be', '48fcc9cb-2034-4ce7-9c88-6af1dda03b98', '14182a57-70b2-47d6-b407-77a6c1492b2b', '47bd7c7a-b2fe-47e6-a864-93b3007c0a60', '322ae98c-b6b7-4c56-9b12-d7534b82cab4', 267592, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('287929b9-483a-44f3-9bae-fe2a3a242b97', 'ecc4cf7d-ecb6-4912-9ecd-ea0f571d96ee', '7488118f-09a9-4a7b-92b3-a10ff07215be', '48fcc9cb-2034-4ce7-9c88-6af1dda03b98', '14182a57-70b2-47d6-b407-77a6c1492b2b', '47bd7c7a-b2fe-47e6-a864-93b3007c0a60', '2b3ccef2-4f6a-4f53-b4de-a8c072a09bc9', 6297, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('c9e1f6eb-13bb-4b05-9437-53840bab3918', 'ecc4cf7d-ecb6-4912-9ecd-ea0f571d96ee', '7488118f-09a9-4a7b-92b3-a10ff07215be', '48fcc9cb-2034-4ce7-9c88-6af1dda03b98', '14182a57-70b2-47d6-b407-77a6c1492b2b', '9d575ae6-0e78-4124-b0fd-1977ede6c0ca', '2b3ccef2-4f6a-4f53-b4de-a8c072a09bc9', 370, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('513ab7d9-b18f-4d7a-a217-1df0a21cb378', 'f8f329c8-96c1-4d86-aec1-44a9551420cc', '068919ce-f593-4d60-9c47-032797e0a3b5', '142528a1-c0f0-46aa-815d-2abdbf602058', 'a5184cd4-3029-4bad-a514-3ccf83f07353', '3dfe674b-b8d2-4952-9f49-fc1868b0040a', '77b3634e-780a-4ee1-a1ba-71e6467318bb', 41861, v_admin_id)
  on conflict (id) do nothing;
  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('728dbd22-0840-4b3a-b81a-3277464cf576', 'f8f329c8-96c1-4d86-aec1-44a9551420cc', '068919ce-f593-4d60-9c47-032797e0a3b5', '142528a1-c0f0-46aa-815d-2abdbf602058', 'a5184cd4-3029-4bad-a514-3ccf83f07353', '787dd778-422a-4ce0-a2ca-df96ebc32a08', '77b3634e-780a-4ee1-a1ba-71e6467318bb', 408139, v_admin_id)
  on conflict (id) do nothing;

  -- 2. Mise à jour des settled_amount sur les échéances 2026-2027
  update escen.installments set settled_amount = 50000 where id = 'c37454c5-b803-478e-8b05-f3132eca635d';
  update escen.installments set settled_amount = 0 where id = '97157434-cb81-45e2-b8d4-bad7ece96360';
  update escen.installments set settled_amount = 50000 where id = '5a4b55a0-13ac-4c93-bfb6-da0830c2d1b0';
  update escen.installments set settled_amount = 283333 where id = '322ae98c-b6b7-4c56-9b12-d7534b82cab4';
  update escen.installments set settled_amount = 6667 where id = '2b3ccef2-4f6a-4f53-b4de-a8c072a09bc9';
  update escen.installments set settled_amount = 0 where id = '53f3e3a1-c1f8-4717-9aa8-270d5611df74';
  update escen.installments set settled_amount = 50000 where id = 'c5fa3fee-5520-4c28-99d8-17b403e0c577';
  update escen.installments set settled_amount = 0 where id = '7df3caec-0ac7-44cc-a434-774f1ac84c95';
  update escen.installments set settled_amount = 0 where id = '0293c799-d80a-4a13-a7c9-6bd24c261725';
  update escen.installments set settled_amount = 0 where id = 'ef7bb5fb-3276-4f35-afbd-9f65ece4c1c0';
  update escen.installments set settled_amount = 0 where id = '73d6bca8-1194-404b-81fc-500882491fe5';
  update escen.installments set settled_amount = 50000 where id = 'b392931c-aaa5-40b3-b426-9a5cdb28d0e5';
  update escen.installments set settled_amount = 0 where id = '6d79193f-75ff-4676-9885-4d8df0ec0a15';
  update escen.installments set settled_amount = 0 where id = '13ac6077-c89e-43c8-a280-28d6b4a0c530';
  update escen.installments set settled_amount = 0 where id = '09cb7bb2-febe-45c3-b718-fee4a9657dcf';
  update escen.installments set settled_amount = 0 where id = '3a6b3872-781f-4fb8-9e19-e1490303c2b7';
  update escen.installments set settled_amount = 50000 where id = '40e15f8d-1982-4459-9970-a122dc050ecc';
  update escen.installments set settled_amount = 0 where id = '05ff705b-75c9-4ea0-a9fb-8ffd238f7cc9';
  update escen.installments set settled_amount = 0 where id = '97372d40-2a7c-4550-bf66-a6df7717512a';
  update escen.installments set settled_amount = 0 where id = 'ed82f872-c12f-4cc4-9824-a39bcaf1f84e';
  update escen.installments set settled_amount = 0 where id = '86f0f4fe-ac57-498a-8f8a-cfd674fa7cb4';
  update escen.installments set settled_amount = 50000 where id = '2626c28e-b291-4b1d-aa08-e38f5aa339e9';
  update escen.installments set settled_amount = 0 where id = '0faeff2b-5e2f-4531-95d4-1a564af3e071';
  update escen.installments set settled_amount = 0 where id = '853b6f9a-2ef6-46f2-a8df-ff887eddbc0e';
  update escen.installments set settled_amount = 0 where id = '8ecc040c-fd66-4081-ab7f-3cc1f69f000e';
  update escen.installments set settled_amount = 0 where id = '8e055dee-ceb1-4a99-b9ca-b710bc094ab9';
  update escen.installments set settled_amount = 50000 where id = '18a6ff1a-a1b8-4588-ae72-29049ccc48fc';
  update escen.installments set settled_amount = 0 where id = '7ed5e8f3-0b6d-4da5-8441-b127fd99daff';
  update escen.installments set settled_amount = 50000 where id = '98255b97-6202-4ca4-afae-43bf1ced5c6b';
  update escen.installments set settled_amount = 0 where id = '741c9f85-0940-4a7d-a64d-66093575a87f';
  update escen.installments set settled_amount = 0 where id = '26e258f4-6830-44a0-baed-4aeae6f2b8cc';
  update escen.installments set settled_amount = 0 where id = '475ba383-84e2-41ad-b050-314fd9acc7e1';
  update escen.installments set settled_amount = 0 where id = '37a73dcf-5d9d-4a4f-a834-8a5d41af8f6b';
  update escen.installments set settled_amount = 50000 where id = 'ddeff611-6def-4a90-8b85-a83d370d7222';
  update escen.installments set settled_amount = 120000 where id = '232ce517-9c09-42ac-ae3b-3b705b1ea5d5';
  update escen.installments set settled_amount = 40000 where id = 'd422ac89-bcfa-4474-89a8-57c0eb8daeb6';
  update escen.installments set settled_amount = 0 where id = '5c6c8ceb-3de3-403e-854c-90d2e87f52ab';
  update escen.installments set settled_amount = 0 where id = 'fe1e30d9-dcad-4f37-9fc5-65e19890586a';
  update escen.installments set settled_amount = 50000 where id = 'a8960ad9-49fc-4db3-8a2a-feeb94414b27';
  update escen.installments set settled_amount = 120000 where id = '92d6fbb2-0efb-4dce-9f0e-08bab42008f5';
  update escen.installments set settled_amount = 120000 where id = 'c36e843f-3585-4ec5-83bb-128fb8783403';
  update escen.installments set settled_amount = 0 where id = '1cce7c95-a5dc-406c-a6aa-dd6ddf84e8b4';
  update escen.installments set settled_amount = 118000 where id = 'a020b4e1-529c-4d1e-8c9c-6c14216abdbe';
  update escen.installments set settled_amount = 50000 where id = '254956d8-aa3f-4191-978b-9e069da8eb43';
  update escen.installments set settled_amount = 0 where id = '91693cd4-64b7-4a96-b959-3bdc3d4975a7';
  update escen.installments set settled_amount = 50000 where id = 'e9479046-8eee-4e91-9c28-897b3123039e';
  update escen.installments set settled_amount = 408000 where id = 'dd05e804-013b-4c5c-b805-e30382e0f820';
  update escen.installments set settled_amount = 50000 where id = '7a059b28-2335-4555-adb3-9ca23d7bf9fd';
  update escen.installments set settled_amount = 108000 where id = 'bf8acd99-9791-4ba6-a193-5da58475ffb3';
  update escen.installments set settled_amount = 50000 where id = 'c4abbfea-30ce-4620-a378-f2c01e208fd1';
  update escen.installments set settled_amount = 0 where id = 'f5799b29-b3b6-42c5-b7d2-f1e69dbf8148';
  update escen.installments set settled_amount = 0 where id = '961f5e4b-a684-4e4b-9cc9-aef4f064937c';
  update escen.installments set settled_amount = 0 where id = 'e78404a6-8c16-4d92-aeaf-c331cd8451d2';
  update escen.installments set settled_amount = 0 where id = '3d16ad5f-1e46-4813-8796-308cf36e19ae';
  update escen.installments set settled_amount = 50000 where id = '0cec431e-67ae-40df-be8a-1f79403faa1c';
  update escen.installments set settled_amount = 120000 where id = '17e3575e-c16d-434a-a5b9-139f6b7c3650';
  update escen.installments set settled_amount = 0 where id = '024fda26-62eb-4b56-8979-7d2b297391e4';
  update escen.installments set settled_amount = 0 where id = 'c9337644-1030-41a8-86c7-065cc2cb05c0';
  update escen.installments set settled_amount = 0 where id = '20440bc8-40e6-4c28-af2f-d318b3e5447e';
  update escen.installments set settled_amount = 50000 where id = 'adcd0e63-9358-448d-924d-8f15200bdb68';
  update escen.installments set settled_amount = 0 where id = '06df4ddf-da5f-4a1a-825f-553cb78b6821';
  update escen.installments set settled_amount = 0 where id = '3791aae7-a9e2-4f51-a79b-2662de3df199';
  update escen.installments set settled_amount = 0 where id = 'fe8d68ce-02e5-4a07-9bcc-5ab717f8261c';
  update escen.installments set settled_amount = 0 where id = 'c8708892-bfe9-4995-aad1-273785c1c5c5';
  update escen.installments set settled_amount = 50000 where id = '00fad9ac-fce3-4cef-83b2-4ef15aed3f86';
  update escen.installments set settled_amount = 0 where id = 'b06beff0-ab62-4874-9f16-d221cea25e29';
  update escen.installments set settled_amount = 0 where id = '23d40886-d474-4f53-b5cf-2e25ce80ee39';
  update escen.installments set settled_amount = 0 where id = '657793b8-2a55-4a44-a73a-900d8b4cdf31';
  update escen.installments set settled_amount = 0 where id = 'e50b3a04-7135-4fa2-bdd9-343505218e48';
  update escen.installments set settled_amount = 50000 where id = '8dafd635-4b28-493c-97d6-43631b57fe79';
  update escen.installments set settled_amount = 0 where id = 'a68f8515-1c10-465b-b480-d3978031de64';
  update escen.installments set settled_amount = 0 where id = 'a93ca85f-319a-4fa0-bbf6-496a141648a9';
  update escen.installments set settled_amount = 0 where id = '0fc8f6df-ee15-4e50-9be9-219389958041';
  update escen.installments set settled_amount = 0 where id = 'fa8e306a-9680-459e-920a-02dbb62f3195';
  update escen.installments set settled_amount = 50000 where id = '31176dbc-506c-40b5-ac9d-fdb4af006997';
  update escen.installments set settled_amount = 68750 where id = '2d37f007-3f1e-4dc1-967f-fe823c8f305d';
  update escen.installments set settled_amount = 68750 where id = 'e4e8c8c7-d8d2-4587-8765-4651456e91b2';
  update escen.installments set settled_amount = 37750 where id = '4eaad1f2-61a5-45fd-9264-fb39ce22feeb';
  update escen.installments set settled_amount = 68750 where id = '9deebd6d-d488-46f8-b4ae-b6c9d0615845';
  update escen.installments set settled_amount = 50000 where id = '94e8804a-af24-49a9-a930-08770a296374';
  update escen.installments set settled_amount = 0 where id = '59964d71-791a-4829-b19a-60371124c7ea';
  update escen.installments set settled_amount = 0 where id = '9ad76a8f-4cca-4d18-b1d1-8c26191f5d89';
  update escen.installments set settled_amount = 0 where id = '1e974d3f-699e-4946-883d-1515d143f7cf';
  update escen.installments set settled_amount = 0 where id = 'c68c1142-5058-4888-9ffd-76affdae7008';
  update escen.installments set settled_amount = 50000 where id = '5a58c670-6c30-4cfe-90da-d2e62ac46aea';
  update escen.installments set settled_amount = 137500 where id = '79997e3b-4c9b-4ddb-ab4f-afefd643888b';
  update escen.installments set settled_amount = 137500 where id = '2f2a2d58-643a-4fdb-ac23-0803b3990127';
  update escen.installments set settled_amount = 137500 where id = '40156abc-7ec2-4bf9-95b3-c7440badba86';
  update escen.installments set settled_amount = 137500 where id = '44fcd999-abaa-4db4-9b08-df72afdb91f5';
  update escen.installments set settled_amount = 50000 where id = 'fc9f196e-985e-46ba-ba10-f7135a767a1a';
  update escen.installments set settled_amount = 134000 where id = '3ed8ba0d-4a5a-4960-bdc9-8e913789977f';
  update escen.installments set settled_amount = 0 where id = '0c72f9ac-a3af-4d15-ab15-1b28d7073e5c';
  update escen.installments set settled_amount = 0 where id = '5d332952-f67b-4eac-85b9-3e1993779ed9';
  update escen.installments set settled_amount = 0 where id = '8add477e-3e27-4a40-9fd2-3a4fa051cd1c';
  update escen.installments set settled_amount = 50000 where id = 'b0ac8d3b-cef4-4833-bcb7-588da1616a10';
  update escen.installments set settled_amount = 450000 where id = '77b3634e-780a-4ee1-a1ba-71e6467318bb';
  update escen.installments set settled_amount = 0 where id = '60143d82-a119-4d3d-a6f7-1629d27ba0f5';
  update escen.installments set settled_amount = 0 where id = '14548f0c-de24-48ef-aec8-e9ae731e7bdd';
  update escen.installments set settled_amount = 0 where id = 'db226c38-d6f2-481c-894d-67dfe1893749';
  update escen.installments set settled_amount = 0 where id = '8594a66c-de57-4322-8be8-eae76cb7d55b';
  update escen.installments set settled_amount = 0 where id = '232227a4-f0de-4c70-8a44-0f0c8fe4d998';
  update escen.installments set settled_amount = 50000 where id = 'f989b15a-dad8-4c9d-9d8c-81cebdacc0a7';
  update escen.installments set settled_amount = 0 where id = 'd49d2ed3-6ac1-4312-b038-497153ae4c3c';
  update escen.installments set settled_amount = 0 where id = 'efe24563-fa41-433c-a9b2-636330551473';
  update escen.installments set settled_amount = 0 where id = '73139a91-ac96-454d-8510-88d35a490594';
  update escen.installments set settled_amount = 0 where id = '09af3d2b-9e4c-45cc-a1e7-7e084a2324ab';
  update escen.installments set settled_amount = 50000 where id = '3bc887a2-d2a4-4d5d-8109-12c9ec9bf9a5';
  update escen.installments set settled_amount = 0 where id = '269f299d-70c4-4d6b-89bd-a4e9be108958';
  update escen.installments set settled_amount = 0 where id = '98f98f89-953b-48d4-9865-e6cb9cf80c02';
  update escen.installments set settled_amount = 0 where id = '8afcb304-0d8e-42ea-ae1a-955fe399a700';
  update escen.installments set settled_amount = 0 where id = '0cd6cded-2e2e-44da-885e-a01ad24a1ab9';
  update escen.installments set settled_amount = 50000 where id = '774266ca-95f5-4ace-9ded-c9b6b1a9ad52';
  update escen.installments set settled_amount = 0 where id = '3aad0759-a59f-4b7d-9b67-6c66e21e5a0a';
  update escen.installments set settled_amount = 0 where id = 'f68ebc29-3d3b-4d6a-8a44-1fea51a5fca3';
  update escen.installments set settled_amount = 0 where id = 'ebd2a304-57e6-4049-8a89-320a630c1390';
  update escen.installments set settled_amount = 0 where id = '26c96a56-e9aa-4904-8229-ea063c51582c';
  update escen.installments set settled_amount = 0 where id = '91182e35-7714-4322-826a-28ea623a5ca8';
  update escen.installments set settled_amount = 0 where id = 'f39b4db7-60c7-46d4-887b-a59c877338c7';
  update escen.installments set settled_amount = 0 where id = 'd4ed436e-270a-435f-8c6a-99fbc84e706e';
  update escen.installments set settled_amount = 0 where id = '2d487fd3-ef44-4a93-8292-c21c819d0d35';
  update escen.installments set settled_amount = 0 where id = '5b7f0a79-b05a-4688-9e47-61163f0c2955';
  update escen.installments set settled_amount = 50000 where id = '95929481-61b5-4279-90be-2991b58ba57c';
  update escen.installments set settled_amount = 0 where id = 'ba81e27f-6e64-4b9e-b132-0ab7dc8928a6';
  update escen.installments set settled_amount = 0 where id = '9fcb6251-a74c-428f-b1c1-3f14c00c46a2';
  update escen.installments set settled_amount = 0 where id = 'a3e46e52-a07e-4ee1-869e-1eaf4646df34';
  update escen.installments set settled_amount = 0 where id = '23e4c1dd-732c-4356-93d5-be99f0c55169';
  update escen.installments set settled_amount = 50000 where id = '0057f210-652c-4281-b2c3-2b9a103080d4';
  update escen.installments set settled_amount = 0 where id = '7781b1df-8fdb-40fd-b80b-0c27b2e33dd2';
  update escen.installments set settled_amount = 50000 where id = '34a269d8-5eda-4d08-a668-dda9ae0957f7';
  update escen.installments set settled_amount = 68750 where id = '188db274-bca1-42e6-b8a7-c7ef72795f99';
  update escen.installments set settled_amount = 31250 where id = '3422eb1f-08d6-40d8-8e5c-6153552fee1a';
  update escen.installments set settled_amount = 0 where id = '185b830c-544d-46dd-a208-b6e9c3bb713e';
  update escen.installments set settled_amount = 0 where id = '7ea678d9-1263-4178-bb41-9cac8cf1418d';
  update escen.installments set settled_amount = 50000 where id = '085dab55-7e34-4749-884a-761f1c95fde6';
  update escen.installments set settled_amount = 0 where id = '8135a869-3a45-42a1-8965-63941fafbc0c';
  update escen.installments set settled_amount = 0 where id = '129b3ef7-ad74-4be0-ad57-4e1c723622f8';
  update escen.installments set settled_amount = 0 where id = '0927cf71-bcf7-4358-a658-ea786a506e6e';
  update escen.installments set settled_amount = 0 where id = '2e6ce526-73b4-4eff-a13f-e75482a1c74d';
  update escen.installments set settled_amount = 50000 where id = '2cf0e59c-385b-4e32-bbf0-02813c85a13a';
  update escen.installments set settled_amount = 135000 where id = '59c768b9-f123-417d-8149-1b4d222d045b';
  update escen.installments set settled_amount = 0 where id = '59ff68fd-e4c0-4b90-857e-76c8cf08a642';
  update escen.installments set settled_amount = 0 where id = '39aa5f64-65e4-4a86-83e9-53a28713a0de';
  update escen.installments set settled_amount = 0 where id = '60840fa3-d2bc-4e10-bdba-dab1e32c0235';
  update escen.installments set settled_amount = 50000 where id = '34fe08bf-deba-442b-ba2e-f1b537eaaed1';
  update escen.installments set settled_amount = 0 where id = 'b529b381-aaa2-494a-a2ae-a3d60813bc96';
  update escen.installments set settled_amount = 0 where id = 'd594b0f0-c92a-4691-8750-3b7a4cf51158';
  update escen.installments set settled_amount = 0 where id = '1cd5a6f5-7332-41c6-812d-ba4a0d9dfb9d';
  update escen.installments set settled_amount = 0 where id = '28301c02-099e-4dba-ab0e-2ed5bd4498d6';
  update escen.installments set settled_amount = 50000 where id = 'c3706ca5-2cf0-4f35-95bd-ec88005edba4';
  update escen.installments set settled_amount = 137500 where id = '3f41bfd8-d8d5-45b8-aaa5-9f2bf3df7148';
  update escen.installments set settled_amount = 47500 where id = 'cd9f7993-7dd7-4ccc-bde8-d34be576f859';
  update escen.installments set settled_amount = 0 where id = '146902b1-23a9-4275-99f1-e75e7bd7554d';
  update escen.installments set settled_amount = 0 where id = 'c73b08aa-bad9-419e-a1c9-8d55b88b5ecb';
  update escen.installments set settled_amount = 50000 where id = '79de32ef-ead6-4e21-9de1-cdeaf15a2f96';
  update escen.installments set settled_amount = 0 where id = '7e3c701e-5a1c-4b60-83a7-8b5eff507581';
  update escen.installments set settled_amount = 0 where id = '383fe7af-9cff-4126-9db7-8a4492e1b129';
  update escen.installments set settled_amount = 0 where id = 'b20b7e5e-43a0-4939-b1b3-d0d7ae178778';
  update escen.installments set settled_amount = 0 where id = '07e41ab1-5e71-4c5c-abc9-784f1ac47291';
  update escen.installments set settled_amount = 0 where id = 'fda27413-a9a5-4509-a7a6-bb30c6860bcc';
  update escen.installments set settled_amount = 0 where id = '489a4022-8ac2-4fae-88bc-347942cce768';
  update escen.installments set settled_amount = 0 where id = 'ff8d2576-7c0e-4d13-aa6b-5caa257749af';
  update escen.installments set settled_amount = 0 where id = '71eb9031-3d73-4faa-ae78-2780b5006ff3';
  update escen.installments set settled_amount = 0 where id = 'f024e467-e9df-4313-97ed-6467d9f6b705';
  update escen.installments set settled_amount = 50000 where id = '345412b4-040c-429c-951a-75a3cd4e366e';
  update escen.installments set settled_amount = 137500 where id = '4e9e70b3-7d78-4283-9437-ec9f8f1b6d92';
  update escen.installments set settled_amount = 50000 where id = '712fd857-d77e-46fa-8c67-d14d8f1ee276';
  update escen.installments set settled_amount = 0 where id = 'fd7725d5-f258-4127-84cc-55f49bfe3774';
  update escen.installments set settled_amount = 0 where id = 'd7325832-1ac0-461b-a5bd-8fcbbd4dab24';
  update escen.installments set settled_amount = 0 where id = 'efa9b4e3-8ca8-4082-8d05-c57710f40ab2';
  update escen.installments set settled_amount = 0 where id = '12ead7da-79d9-4cf6-b1a1-e248d6fd6be0';
  update escen.installments set settled_amount = 50000 where id = '3a4cbf83-72d9-4e2e-95e4-8951d8bcf183';
  update escen.installments set settled_amount = 0 where id = '18ce1aaa-f692-46d7-9920-2a747a7dea3a';
  update escen.installments set settled_amount = 0 where id = '97724ee9-247e-4393-8541-3a691a95ef02';
  update escen.installments set settled_amount = 0 where id = 'a04269d3-30b7-4adb-bbbc-745d50db7e35';
  update escen.installments set settled_amount = 0 where id = '418873ac-4b76-466e-bd84-ad6e9d662589';
  update escen.installments set settled_amount = 50000 where id = 'a1b6108b-cc93-42ab-86c8-80cf15fa3161';
  update escen.installments set settled_amount = 100000 where id = '126f64ac-bf7d-4435-98b1-4822425d8a81';
  update escen.installments set settled_amount = 0 where id = '26d95c3e-6161-4bfa-9bfd-10fd4f0f8947';
  update escen.installments set settled_amount = 0 where id = '05ff2e1c-5457-4e52-8b97-a36a0162ecc4';
  update escen.installments set settled_amount = 0 where id = 'd097b2c6-16a8-468d-9fa8-60812cd8331e';
  update escen.installments set settled_amount = 0 where id = 'e87feb89-e613-41c3-93b0-922a5297e22e';
  update escen.installments set settled_amount = 0 where id = 'f05f6c9d-3657-402e-9c77-fbe00b30131a';
  update escen.installments set settled_amount = 0 where id = 'fcac57c2-55f6-4860-b691-fda17d20532f';
  update escen.installments set settled_amount = 0 where id = '776c052f-fe91-42c3-84a6-8704a99af5ab';
  update escen.installments set settled_amount = 50000 where id = '97b9238b-70f3-4974-b42e-3805fa3cd619';
  update escen.installments set settled_amount = 0 where id = 'cad3dd2e-a754-49d1-85f8-3778bbb26cf5';
  update escen.installments set settled_amount = 0 where id = '2d462d25-8ddc-4ab5-99ef-60d99f8c0845';
  update escen.installments set settled_amount = 0 where id = '721c6bf0-53e2-475f-bb69-726a30527b9c';
  update escen.installments set settled_amount = 0 where id = 'cf257a1d-e39a-439d-adf0-8013704f5311';
  update escen.installments set settled_amount = 0 where id = 'e58e9738-529e-4c3c-8e75-f40a920d7645';
  update escen.installments set settled_amount = 0 where id = 'f550a450-b724-4ddf-847c-64eca42c3323';
  update escen.installments set settled_amount = 50000 where id = '67a3e714-3649-4251-80d1-01e1b2729d4e';
  update escen.installments set settled_amount = 0 where id = 'f0188d1d-55d3-46d3-adb6-50ecd4b1da95';
  update escen.installments set settled_amount = 0 where id = '7fc3c5ae-d04d-4c60-ba70-5e488b954382';
  update escen.installments set settled_amount = 0 where id = '35d08d58-e2b1-4f33-aaad-18443990efae';
  update escen.installments set settled_amount = 0 where id = 'a278db5b-74d6-4dab-8e82-e749258c0e37';
  update escen.installments set settled_amount = 50000 where id = 'c826e39e-2dc5-4c4b-bc77-61b8bcfb4e14';
  update escen.installments set settled_amount = 0 where id = '4ae74315-aed2-4333-9245-48e93cad69c8';
  update escen.installments set settled_amount = 0 where id = '21637ee7-9ae3-4b73-948f-48d6683c234b';
  update escen.installments set settled_amount = 0 where id = '6f09d747-c75a-4c86-b0cd-e3230428ce7f';
  update escen.installments set settled_amount = 0 where id = 'e16d4f36-26cb-4373-9cea-4047f66abe83';
  update escen.installments set settled_amount = 50000 where id = 'def64fe4-8019-46a5-acee-e4762a314033';
  update escen.installments set settled_amount = 0 where id = '17f965cf-a139-4f02-8286-f338f48b9fcb';
  update escen.installments set settled_amount = 0 where id = 'dafa98c1-781f-40f3-84a6-4f6705e9d627';
  update escen.installments set settled_amount = 0 where id = '58d1e195-fcae-4431-93ca-85ed3d5a143c';
  update escen.installments set settled_amount = 0 where id = 'ef7d0d45-fab8-46e8-9a68-2ea4ea8fda7e';
  update escen.installments set settled_amount = 0 where id = '415f2cd7-0371-4825-9791-35dd0cd40889';
  update escen.installments set settled_amount = 0 where id = 'b78fa140-18d1-4e4a-bf0d-bccecab3106f';
  update escen.installments set settled_amount = 50000 where id = '624138e3-6e68-4002-8ad5-2d5ffe293838';
  update escen.installments set settled_amount = 137500 where id = '1c262ba6-f23f-4656-8f1b-48f415fc3d32';
  update escen.installments set settled_amount = 137500 where id = '8a8f7fe1-9aaa-404a-94a8-728205c52d82';
  update escen.installments set settled_amount = 0 where id = '9f937427-03fd-409a-8e16-5b87c74eef50';
  update escen.installments set settled_amount = 25000 where id = 'b8ed24e7-b43f-484f-89b8-973fa984338a';
  update escen.installments set settled_amount = 50000 where id = '36f4381f-873e-4057-a9cb-d939c7dfcaf1';
  update escen.installments set settled_amount = 0 where id = 'cdc8d05e-6681-4f75-b454-a220f9fdaa0b';
  update escen.installments set settled_amount = 0 where id = '93469c88-46d3-4435-8742-6e21a82a3338';
  update escen.installments set settled_amount = 0 where id = '0ad52f93-7c50-4dcc-8811-6c7f2d0724ad';
  update escen.installments set settled_amount = 0 where id = 'a94cc8ae-832e-409b-836b-86f16629e608';
  update escen.installments set settled_amount = 0 where id = '6f315fa8-9c10-44b4-aca2-dbe4fdb431a6';
  update escen.installments set settled_amount = 0 where id = '3bc4c486-d23b-40df-9980-4390e9c5a04b';
  update escen.installments set settled_amount = 0 where id = '51c8ac4f-a01d-4322-a83c-0781539a0992';
  update escen.installments set settled_amount = 0 where id = '45615309-9708-48b1-853c-b8bb856bca8f';
  update escen.installments set settled_amount = 0 where id = '067d4d0b-ec22-42a9-a734-ff3f13630efd';
  update escen.installments set settled_amount = 50000 where id = '88c4c8c9-0f2c-4ee4-bae4-e6eb780efd49';
  update escen.installments set settled_amount = 212500 where id = '2a996979-6da4-4a14-ab30-854ee34456dd';
  update escen.installments set settled_amount = 37500 where id = '31a36886-f285-48c1-8dd1-8feeea54a12d';
  update escen.installments set settled_amount = 0 where id = 'c95e4ccd-9cc4-407c-823d-5c5a5e8a0751';
  update escen.installments set settled_amount = 0 where id = 'f925c756-8907-4971-a3f3-3dbbbb10f87a';
  update escen.installments set settled_amount = 50000 where id = 'f1fb67c7-6db5-490d-a996-5edc27210e6e';
  update escen.installments set settled_amount = 0 where id = '07a19fcf-f1a4-439c-8e80-3755ffc409f6';
  update escen.installments set settled_amount = 0 where id = '1da447bd-ca8d-4731-afb5-c39b142f1943';
  update escen.installments set settled_amount = 0 where id = 'b89e6d83-1d41-407c-8689-c33d51bd8036';
  update escen.installments set settled_amount = 0 where id = '4cb0dbfd-e72f-41bd-8d3f-29d2025e836f';
  update escen.installments set settled_amount = 50000 where id = 'e71bedef-e243-479c-9866-9d38cdd1e323';
  update escen.installments set settled_amount = 0 where id = 'ab277b0e-5589-41b9-88b1-cd87ecde081e';
  update escen.installments set settled_amount = 0 where id = '99a72273-3a76-41d5-9fed-f9136eb05d91';
  update escen.installments set settled_amount = 0 where id = '7eeda243-82ba-49c9-8284-7e384df0ba06';
  update escen.installments set settled_amount = 0 where id = '1a352f0c-5cc8-4faa-acdd-f36d7aec50c6';
  update escen.installments set settled_amount = 50000 where id = 'cc32791d-df9b-4d08-babc-b3416aa826f2';
  update escen.installments set settled_amount = 0 where id = '420b5372-6cbf-4c22-aac9-84514291950d';
  update escen.installments set settled_amount = 0 where id = '7df4603d-076a-4c85-a422-0013baf9de3c';
  update escen.installments set settled_amount = 0 where id = '3394c25b-7dc7-4120-b4c8-87eb10d547ac';
  update escen.installments set settled_amount = 0 where id = 'b9711537-d332-4183-8feb-c8fb780850b7';
  update escen.installments set settled_amount = 50000 where id = '451e88fb-798f-411b-a352-fd06a4b1f0e8';
  update escen.installments set settled_amount = 0 where id = 'b60e1b86-32c7-44f1-b419-eb7ddfb981ac';
  update escen.installments set settled_amount = 0 where id = 'f3990928-e2e1-44c0-a80f-84daaf8fc186';
  update escen.installments set settled_amount = 0 where id = '10d64815-a0f8-477f-a7a3-e5b068ec86d3';
  update escen.installments set settled_amount = 0 where id = 'd073f6dc-ea89-4a64-9511-17f7fc4d7b86';
  update escen.installments set settled_amount = 0 where id = '1d9154df-1b19-4e5b-87d0-e5726784ab32';
  update escen.installments set settled_amount = 0 where id = '3ef515d0-d159-4a61-908d-0889d427e9af';
  update escen.installments set settled_amount = 0 where id = '1860e004-9c3f-4603-9e0d-75270d3a1130';
  update escen.installments set settled_amount = 0 where id = 'f1bca583-acd2-45c4-86b9-257d00d462db';
  update escen.installments set settled_amount = 0 where id = 'fab466ec-42c4-4137-a01c-7a87257988b6';
  update escen.installments set settled_amount = 50000 where id = 'b3551930-168b-45d8-a5c1-4e7dc26530f1';
  update escen.installments set settled_amount = 0 where id = 'c1d7dc46-1683-4636-b39e-9555e7966bf9';
  update escen.installments set settled_amount = 0 where id = 'd946b5d1-8df1-4f47-a6bb-5046db304176';
  update escen.installments set settled_amount = 0 where id = 'f61de6f4-d053-4e58-b983-b4b8dd6d8996';
  update escen.installments set settled_amount = 0 where id = 'a91ebdd0-9130-4af7-9ba8-b3205dcd7e84';
  update escen.installments set settled_amount = 50000 where id = '00068d6c-f243-43f0-aa57-0e04a9e2d92a';
  update escen.installments set settled_amount = 0 where id = 'e0d6e84d-cdec-48f9-a9ae-90725e27c10c';
  update escen.installments set settled_amount = 0 where id = '63f9e485-0ef9-4423-ac6d-d427ce0cdf91';
  update escen.installments set settled_amount = 0 where id = '9703cf70-af5d-42c2-9eba-1a5716770ea7';
  update escen.installments set settled_amount = 0 where id = '95543668-cbda-426d-ac99-d5641d1d10a9';
  update escen.installments set settled_amount = 50000 where id = 'dff52db4-5331-402e-a947-9f7923e246fb';
  update escen.installments set settled_amount = 0 where id = '3dd79e32-bae5-4699-bc42-69a7688cf485';
  update escen.installments set settled_amount = 0 where id = 'e7102224-fcc4-4fb2-9aca-d2cbb791ca14';
  update escen.installments set settled_amount = 0 where id = '27e5b985-85cf-499e-a045-f436e3c36afa';
  update escen.installments set settled_amount = 0 where id = '7862bfc5-243c-4192-b671-2b8069b14189';
  update escen.installments set settled_amount = 50000 where id = '664a1939-69ad-4434-91b6-f84bba49b070';
  update escen.installments set settled_amount = 0 where id = 'ac4a6984-1059-4aa1-978a-e019e744a6d8';
  update escen.installments set settled_amount = 0 where id = '5dabaf2d-4949-44fe-8b0b-ad1159689d24';
  update escen.installments set settled_amount = 0 where id = '089f2324-3e54-4a0d-a01e-dec78dd0c588';
  update escen.installments set settled_amount = 0 where id = 'a4f5f2f2-1fea-4f82-b66b-f65bc479264d';
  update escen.installments set settled_amount = 50000 where id = 'b1ca3992-f5b6-4f04-859b-f9966495ad52';
  update escen.installments set settled_amount = 137500 where id = 'd36e136a-608a-4c69-8e31-3e7a499e9063';
  update escen.installments set settled_amount = 137500 where id = 'a6645218-1bcb-43e1-89d0-0e084b6c8c36';
  update escen.installments set settled_amount = 0 where id = 'cd884e60-3d00-4398-a3a3-5343316f3d51';
  update escen.installments set settled_amount = 75000 where id = '272d8a0e-1976-47b1-9c60-ac606c947f38';
  update escen.installments set settled_amount = 50000 where id = '1d8c4e25-21bd-4bc7-93df-86c6f61ca2f6';
  update escen.installments set settled_amount = 0 where id = '6035bd79-79ce-4bb8-9824-9331c95477d2';
  update escen.installments set settled_amount = 0 where id = 'ba7b0699-2f8b-4fa6-9f8d-17b316ce6957';
  update escen.installments set settled_amount = 0 where id = 'bfab2280-8b12-4ce0-b8dd-ba42cd208ef9';
  update escen.installments set settled_amount = 0 where id = '1872aefb-65a6-4b38-b4f7-93b48ac46b9d';
  update escen.installments set settled_amount = 0 where id = 'ce435551-9f2d-4bae-8b33-d1243b4888aa';
  update escen.installments set settled_amount = 0 where id = 'c0d65aa7-6e87-4a00-94d4-f537ce720444';
  update escen.installments set settled_amount = 0 where id = '2d09d655-15fc-47a1-bf6a-f1986524700e';
  update escen.installments set settled_amount = 0 where id = '2c4a0189-94c2-459a-8dea-1689442aecef';
  update escen.installments set settled_amount = 0 where id = '75d78e56-f931-4aec-a298-012809c38ac7';
  update escen.installments set settled_amount = 0 where id = 'acedc5f3-2184-4d50-8a21-c565942339cf';
  update escen.installments set settled_amount = 0 where id = '29fd16df-cf96-49c3-ac1f-28260190b736';
  update escen.installments set settled_amount = 0 where id = '3e3def4f-82e0-4d70-b814-a4fe6da19487';
  update escen.installments set settled_amount = 0 where id = '5be83edd-a813-4f58-a492-09a54ebf26bc';
  update escen.installments set settled_amount = 0 where id = '3de3df9c-001e-4a40-9aed-d727f704af72';
  update escen.installments set settled_amount = 50000 where id = '8142fc51-bd88-441f-a140-074b23304b2b';
  update escen.installments set settled_amount = 0 where id = 'b6d1e20d-b5a1-4adb-9312-a8ff819cd3ff';
  update escen.installments set settled_amount = 0 where id = 'ae3bc8c2-5e3d-4bf3-920b-3d545ba7673a';
  update escen.installments set settled_amount = 0 where id = 'f5630deb-b9c8-4aa7-b205-86439c404a4f';
  update escen.installments set settled_amount = 0 where id = 'c38de8a2-0483-441f-9d91-ba95ede702bb';
  update escen.installments set settled_amount = 0 where id = '6bb04b4a-06f0-413a-9b78-33c999be1621';
  update escen.installments set settled_amount = 0 where id = '0cab7d89-d7e1-4b05-ab9f-1ff3e1cb054f';
  update escen.installments set settled_amount = 0 where id = '32295f78-7c03-4388-b5ef-80379b5aee50';
  update escen.installments set settled_amount = 0 where id = '6045891e-3b3a-43f8-9515-a7e61bc57f78';
  update escen.installments set settled_amount = 0 where id = 'c73a9384-ac33-439a-b6c8-44597045829c';
  update escen.installments set settled_amount = 50000 where id = '60d7e630-eb25-4932-96b6-776dc78191ab';
  update escen.installments set settled_amount = 0 where id = '2b5d60b1-ed9b-4361-b955-4e5e618e7ccc';
  update escen.installments set settled_amount = 0 where id = 'c22a7c58-2f0a-4380-b0f0-a394e3caae63';
  update escen.installments set settled_amount = 0 where id = '1fc3e782-7b36-4de2-9416-356c95a78ec2';
  update escen.installments set settled_amount = 0 where id = 'e7352377-3b5b-4cc0-8305-7d3987650f24';
  update escen.installments set settled_amount = 50000 where id = '48153367-dd36-47bb-beb1-133baa86fbdb';
  update escen.installments set settled_amount = 0 where id = 'ec68de1a-b8fd-43a5-9375-f8fda02b6a60';
  update escen.installments set settled_amount = 0 where id = 'd9715d25-b3c1-4031-86cc-16f9d6c723dd';
  update escen.installments set settled_amount = 0 where id = '9d4ed572-fbab-4d5f-bda8-7d454a916ea5';
  update escen.installments set settled_amount = 0 where id = 'dbb3c5d9-9895-4083-9564-ca4e0cc6ad0f';
  update escen.installments set settled_amount = 50000 where id = 'cec13ffb-33cb-40a0-8c0c-5e8f0863b386';
  update escen.installments set settled_amount = 0 where id = 'd9718af5-5364-4e07-aec1-e30e35d9d388';
  update escen.installments set settled_amount = 0 where id = '453e542d-9807-4e16-862f-ee12b0e6d629';
  update escen.installments set settled_amount = 0 where id = '2293bfeb-5b5f-4016-ac19-69b94ddb85bf';
  update escen.installments set settled_amount = 0 where id = '5bda8aa7-5227-4def-8724-599a6bc1fcdc';
  update escen.installments set settled_amount = 50000 where id = '1f10e8c9-bd28-4cfe-b8de-447bc587dd02';
  update escen.installments set settled_amount = 0 where id = '4331fccb-3070-44fa-86cf-54ab0fab60aa';
  update escen.installments set settled_amount = 0 where id = '0d00c633-53e8-4780-99f0-beffd0b8e979';
  update escen.installments set settled_amount = 0 where id = 'b02179e5-3193-4b7f-9bfd-a4569de63d23';
  update escen.installments set settled_amount = 0 where id = '26f7d7c4-016b-41ec-904d-c72bce23b2e5';
  update escen.installments set settled_amount = 50000 where id = '39bcb14d-5c08-4dc6-8dcf-177ca08ca248';
  update escen.installments set settled_amount = 0 where id = '07c20ff0-8225-4e8e-bde8-d3b0ffb46975';
  update escen.installments set settled_amount = 0 where id = '97b9ee16-ad39-41a1-9832-0868d7ef102f';
  update escen.installments set settled_amount = 0 where id = '05cf64f0-5e17-470c-8618-b20d71b9ca11';
  update escen.installments set settled_amount = 0 where id = '968eb9a5-3228-4c49-b70f-ff1a2b365fad';
  update escen.installments set settled_amount = 0 where id = '648ba53d-f27f-44cb-ae43-c91a79e471ca';
  update escen.installments set settled_amount = 0 where id = '50fa3ddc-38c8-4452-b759-45cc1becbeb0';
  update escen.installments set settled_amount = 0 where id = '2ee9fde2-4a69-485f-a39b-e43114922e0f';
  update escen.installments set settled_amount = 0 where id = '77c91f97-b1ca-4c39-8ee6-ce27055a8709';
  update escen.installments set settled_amount = 0 where id = '802c5363-1582-47a5-9344-c9a30c04ba1d';
  update escen.installments set settled_amount = 0 where id = '916e5466-4001-4aca-ba7a-b0cd458eee9e';
  update escen.installments set settled_amount = 0 where id = '653f298b-9a20-4675-9a55-214b1d00f0c7';
  update escen.installments set settled_amount = 0 where id = '7b4ec2e3-67fc-4b24-85a5-bc6e64ee6c45';
  update escen.installments set settled_amount = 0 where id = '0aac05f7-57c8-4007-9b90-fbeb1bd08d0c';
  update escen.installments set settled_amount = 0 where id = '8c55aead-91cb-49ae-ba25-0c883333abd6';
  update escen.installments set settled_amount = 0 where id = '8110a1a7-71f8-4edb-9516-25000901b94e';
  update escen.installments set settled_amount = 0 where id = '0f667072-d615-468b-9aea-d5c17d9e5e82';
  update escen.installments set settled_amount = 0 where id = '363bcf45-5580-43fd-ade3-96c2a519d1ec';
  update escen.installments set settled_amount = 0 where id = 'ed228487-9cb5-4073-bc5e-98a38ec39b75';
  update escen.installments set settled_amount = 0 where id = '51733bc1-a287-46cb-87ab-07353ff99e97';
  update escen.installments set settled_amount = 0 where id = '28f2dd48-f6ad-4673-b835-b239032e1dd9';
  update escen.installments set settled_amount = 0 where id = '3adbb3b0-ed82-43ea-82da-1c360e8fedac';
  update escen.installments set settled_amount = 0 where id = '2c11bfc8-ea59-4168-84e2-3f3912a050a1';
  update escen.installments set settled_amount = 0 where id = '05ba4254-5a16-4623-bd40-ae8c0a7f01f9';
  update escen.installments set settled_amount = 0 where id = 'fe9c90fb-5e88-417c-9cf2-5b1dbcf940e8';
  update escen.installments set settled_amount = 0 where id = '01c1d483-a014-4df6-a144-a98d706294b7';
  update escen.installments set settled_amount = 0 where id = 'a98c37ea-180c-4dbf-854d-d4f75defaccf';
  update escen.installments set settled_amount = 0 where id = '213b7fbf-e705-4236-bb81-415266516c7a';
  update escen.installments set settled_amount = 0 where id = '7942dcc5-a158-4757-afde-dc662e81129e';
  update escen.installments set settled_amount = 0 where id = '8164e1ac-fe16-4f9e-b3cd-1c8920e575d6';
  update escen.installments set settled_amount = 0 where id = 'cb4af170-c43a-4661-a960-eee9df1b5933';
  update escen.installments set settled_amount = 0 where id = 'ea6eb216-3da7-4d3a-ab22-b03e18d9d0b7';
  update escen.installments set settled_amount = 0 where id = 'e219d489-2c5e-4333-ab6a-3edf7c09eae4';
  update escen.installments set settled_amount = 0 where id = 'c09dfd60-691d-4313-8563-0e0b63c33a29';
  update escen.installments set settled_amount = 0 where id = 'c23650f4-833f-47b8-9fe5-2203c235049d';
  update escen.installments set settled_amount = 50000 where id = '6a970e88-9bd7-47d7-b4f4-a252c300a05e';
  update escen.installments set settled_amount = 0 where id = '2424e469-11c4-4aad-965d-466433d9d2e0';
  update escen.installments set settled_amount = 0 where id = '8f558a5c-5bba-479c-b2f1-35142bd1c653';
  update escen.installments set settled_amount = 0 where id = '8694b259-020f-45bf-b0b5-be3e1974de22';
  update escen.installments set settled_amount = 0 where id = '06db7124-1a50-4c28-a6f4-d1700ed57729';
  update escen.installments set settled_amount = 0 where id = 'd816a88b-a977-4b29-8b58-bf3f421f63d6';
  update escen.installments set settled_amount = 0 where id = '211aeb0a-c9c0-426d-8b84-36037612ebeb';
  update escen.installments set settled_amount = 0 where id = 'e494b9dc-4004-4690-9692-fe172510caf0';
  update escen.installments set settled_amount = 0 where id = '50a522f8-7bbf-4f09-bb37-9be4ece10a03';
  update escen.installments set settled_amount = 0 where id = 'b0ea2a19-7b2b-4590-bba6-80b430e2e707';
  update escen.installments set settled_amount = 50000 where id = 'b9cad8c4-c779-4850-89b1-b4b97eabc244';
  update escen.installments set settled_amount = 0 where id = 'ce0676c3-d77c-4aea-8557-7a28dad299f7';
  update escen.installments set settled_amount = 0 where id = '6254a338-a474-460e-8c7e-fa2056591851';
  update escen.installments set settled_amount = 0 where id = 'a58a4bd0-3a9e-4310-8f54-26c1150fe1a9';
  update escen.installments set settled_amount = 0 where id = '45c5ddd1-8e4d-49ea-b676-510d30e062db';
  update escen.installments set settled_amount = 0 where id = 'fd57d6c0-39a4-438c-8102-1ec4131eb079';
  update escen.installments set settled_amount = 0 where id = '338ddb98-605c-4273-a214-b3812f3c2a28';
  update escen.installments set settled_amount = 0 where id = '8efc4d7c-ea40-41e0-ab06-d9c0c972ad90';
  update escen.installments set settled_amount = 0 where id = '72c97e5b-f757-4f4f-9930-926096066e03';
  update escen.installments set settled_amount = 0 where id = '7b24da00-1e31-4f7c-8fef-45be083de37e';
  update escen.installments set settled_amount = 50000 where id = '05e9a8d5-b109-43a6-b7ca-77f19502dfdf';
  update escen.installments set settled_amount = 50000 where id = 'b447fb32-39ad-4b2b-a658-e1ac662d83b2';
  update escen.installments set settled_amount = 0 where id = 'a8a6a39a-d9ff-4b51-85dd-c538b39c8049';
  update escen.installments set settled_amount = 0 where id = '198e1f86-3c59-480a-a947-d24ae10f03a1';
  update escen.installments set settled_amount = 0 where id = '5319f421-f77b-4b6e-ade8-fb9279bb8436';
  update escen.installments set settled_amount = 0 where id = '2628788a-3ce7-4dc1-b074-1b2c7f7e8f03';
  update escen.installments set settled_amount = 0 where id = 'bb4a856c-7335-4186-ac2e-9fa8429c71b8';
  update escen.installments set settled_amount = 0 where id = 'f1e5d811-f841-4e8a-baf9-d27075bd7960';
  update escen.installments set settled_amount = 0 where id = 'c953b789-26ea-4360-b0d2-dbf0e96e07a9';
  update escen.installments set settled_amount = 0 where id = '6be641d1-7af9-4cb8-a7fc-6a642e183e05';
  update escen.installments set settled_amount = 50000 where id = 'e259cc25-c28b-40b4-af40-7ac8af32ebfa';
  update escen.installments set settled_amount = 0 where id = '6492abea-1e76-4083-accb-b4d722b760fb';
  update escen.installments set settled_amount = 0 where id = 'c8253151-52f6-4673-85c3-402f697271c0';
  update escen.installments set settled_amount = 0 where id = '31b196d1-2ad8-4c96-b09a-f3cf9a26fe16';
  update escen.installments set settled_amount = 0 where id = '6e1f1f53-b075-4c5b-bc25-29858b8050c0';
  update escen.installments set settled_amount = 0 where id = '5b22a900-0a68-4bb2-95bc-cef160aa13c6';
  update escen.installments set settled_amount = 0 where id = 'd79cc6d1-e509-4efb-8cf9-fb572eee8ee0';
  update escen.installments set settled_amount = 0 where id = '0349be82-dbc6-4f0a-826f-65f6be5b05ab';
  update escen.installments set settled_amount = 0 where id = '4c900ff5-b8a9-444b-9177-bf4cc4fffa70';
  update escen.installments set settled_amount = 0 where id = '527b3225-a786-4d6d-a0c3-f2ddc1c48a92';
  update escen.installments set settled_amount = 0 where id = '3c1f5fd1-8a3b-4875-958e-a21dfa2a3692';
  update escen.installments set settled_amount = 0 where id = '0ee8fe89-2fbe-4a3a-8a2f-0ae0ec684a6f';
  update escen.installments set settled_amount = 0 where id = '03728b45-58ed-4bb3-abfe-997c912be869';
  update escen.installments set settled_amount = 0 where id = 'a6de4668-e657-4c58-b451-5ecd420da451';
  update escen.installments set settled_amount = 0 where id = '05894feb-6021-4c1a-96ab-bed4bba2a23a';
  update escen.installments set settled_amount = 0 where id = '2015dbc1-e4ca-435c-b92a-06d50f740d1a';
  update escen.installments set settled_amount = 0 where id = '2b7a36e4-32fa-420d-9823-3e566f6f8b4a';
  update escen.installments set settled_amount = 0 where id = '94876efa-23f0-4dec-957e-8f318bc52c69';
  update escen.installments set settled_amount = 0 where id = '567f9e96-b21b-4889-97a1-6b7045e85b9e';
  update escen.installments set settled_amount = 0 where id = '4bb6eb75-4cb2-4ce5-81e8-314ba95f8d3a';
  update escen.installments set settled_amount = 0 where id = '953fa48b-55c3-45b7-bec8-c8f3f40f61fd';
  update escen.installments set settled_amount = 0 where id = '580878e6-53f2-405a-9e49-598a1075e604';
  update escen.installments set settled_amount = 0 where id = 'af5cd78e-79bd-481d-9d27-578317b70689';
  update escen.installments set settled_amount = 0 where id = '5c81a22d-d10c-4d78-a8fe-c4f3a425742f';
  update escen.installments set settled_amount = 0 where id = 'c2600ff2-d37a-4e46-8a3d-c4595a2188ee';
  update escen.installments set settled_amount = 0 where id = 'e3ee71c4-b950-4e64-bac5-23f80dab8eb2';
  update escen.installments set settled_amount = 0 where id = '1f7fbfd0-830e-4595-a1f1-d93d193ffb01';
  update escen.installments set settled_amount = 0 where id = '91b7aca3-ac10-4cc4-98b2-bcd7b91ef1d4';
  update escen.installments set settled_amount = 0 where id = '0f8bf2b0-f29f-4ae1-8256-798bfac75417';
  update escen.installments set settled_amount = 0 where id = '8a4d5382-af04-4fec-b4d6-884c3a8a18a8';
  update escen.installments set settled_amount = 0 where id = '3d13dd83-0e11-4d8c-8022-4bbbb20c7710';
  update escen.installments set settled_amount = 50000 where id = 'd41f14d4-2e64-48ad-a777-5112b1c8694f';
  update escen.installments set settled_amount = 0 where id = '97502dc6-f01a-44b0-a89c-8dffa7d399c7';
  update escen.installments set settled_amount = 0 where id = 'd696754e-01f1-4e79-b8ff-d1e997614671';
  update escen.installments set settled_amount = 0 where id = '6ed228ef-5568-45b8-85f3-c2c36e41840d';
  update escen.installments set settled_amount = 0 where id = '3a5806e4-c3e8-42a5-a3dc-55482be45460';
  update escen.installments set settled_amount = 0 where id = 'c1a520e6-b78a-40ff-87ed-c3a0c4473e58';
  update escen.installments set settled_amount = 50000 where id = 'b3ae368e-ba28-40bd-8ba9-6246987439a6';
  update escen.installments set settled_amount = 0 where id = '6353eccf-e691-45ae-8ce0-b711eb30f98b';
  update escen.installments set settled_amount = 0 where id = '3ced436b-8008-4ee0-aed5-026dc4d46222';
  update escen.installments set settled_amount = 0 where id = 'ad967a19-ca88-4172-acaa-0a5882295422';
  update escen.installments set settled_amount = 0 where id = '2e9fa16a-46b2-4929-8f6f-0e97b6aface7';
  update escen.installments set settled_amount = 0 where id = 'db95dd53-5940-443f-b9ab-bd44d10a373e';
  update escen.installments set settled_amount = 50000 where id = '4539117e-8fe3-4d27-9c66-ac430a7dd4f2';
  update escen.installments set settled_amount = 0 where id = '0dcb70fc-9ccd-4c35-b165-efb206684ca7';
  update escen.installments set settled_amount = 0 where id = '26b4e42d-2432-492f-a0c5-22612495b414';
  update escen.installments set settled_amount = 0 where id = '46622250-cdec-4a41-97f2-aa5b63547f92';
  update escen.installments set settled_amount = 0 where id = '950d5b7f-2890-4f12-9e60-3f7f2df0f40b';
  update escen.installments set settled_amount = 0 where id = '26228853-529d-43e1-a982-38a8750d3ae4';
  update escen.installments set settled_amount = 50000 where id = '28f07fe2-ca80-4d63-a797-7f3b9743332c';
  update escen.installments set settled_amount = 0 where id = 'dc137c6f-0f08-4626-a383-7c1f24b238c6';
  update escen.installments set settled_amount = 0 where id = 'bb61266d-7922-4e46-9fc3-b5accb5f5b31';
  update escen.installments set settled_amount = 0 where id = '3110542a-3152-4f95-8c80-f0af69eef8fa';
  update escen.installments set settled_amount = 0 where id = '4ba9a7f0-c372-4ec9-9306-73aa0f05a9f5';
  update escen.installments set settled_amount = 0 where id = '759831a9-40cf-42fa-933e-c03caef5f27b';
  update escen.installments set settled_amount = 50000 where id = '50dde977-cbc5-4c04-9c1a-74ebb59dc0c1';
  update escen.installments set settled_amount = 0 where id = '29d69bab-6e7e-40d1-b848-2e1e98665ed9';
  update escen.installments set settled_amount = 0 where id = 'aeac32c4-a1e5-4884-9daf-26bf5e0a41fe';
  update escen.installments set settled_amount = 0 where id = '2e09b24e-4471-47c2-8f3e-dd4e58c9ac3e';
  update escen.installments set settled_amount = 0 where id = '89578f74-8f5b-4184-bb8c-37a34626b1f6';
  update escen.installments set settled_amount = 0 where id = '67c3909d-b980-4249-90df-d2625ffc1e65';
  update escen.installments set settled_amount = 50000 where id = '1b492a01-597f-44c5-bab0-2676fb9bb043';
  update escen.installments set settled_amount = 0 where id = 'a8e7dea8-3def-4995-9853-628a8852cc31';
  update escen.installments set settled_amount = 50000 where id = '71dcc3d6-eb15-454a-88c0-a645d2c6b52b';
  update escen.installments set settled_amount = 0 where id = 'c362f41d-6bfe-4b05-895e-11db81562f17';
  update escen.installments set settled_amount = 50000 where id = '58b2a565-2531-492b-be71-ee01b424ba26';
  update escen.installments set settled_amount = 438200 where id = '52669605-c4bc-4eac-9bbb-ac75f2de6060';
end $$;
