CREATE MIGRATION m16bj4zu3bzlbf2n4ef7o7yljtlhtne7jr5bg2w7eunzeqdrrinp6q
    ONTO m1tbdzfbcuoc3tstfgv2yphohulljgdjsotx5y562reuwbin2yshnq
{
  ALTER TYPE default::Transaction {
      CREATE PROPERTY to_address: std::str;
      CREATE INDEX ON (.to_address);
      CREATE PROPERTY block_hash: std::str;
      CREATE INDEX ON (.block_hash);
      CREATE PROPERTY from_address: std::str;
      CREATE INDEX ON (.from_address);
      CREATE PROPERTY block_number: std::int64;
      CREATE INDEX ON (.block_number);
      CREATE PROPERTY block_timestamp: std::int64;
      CREATE PROPERTY gas: std::int64;
      CREATE PROPERTY gas_price: std::int64;
      CREATE PROPERTY gas_used: std::int64;
      CREATE PROPERTY input: std::str;
      CREATE PROPERTY transaction_fee: std::int64;
      CREATE PROPERTY transaction_index: std::int64;
      CREATE PROPERTY value: std::str;
  };
};
