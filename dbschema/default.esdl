module default {
  # Users who interact w/ the system
  type User {
    required property email -> str {
        constraint exclusive;
    };

    property normalizedEmail -> str {
      constraint exclusive;
    };
    required property password -> str;
    property firstName -> str;
    property lastName -> str;
    property fullName := .firstName ++ " " ++ .lastName;
    property phone -> str;
    property address -> str;
    property profileImg -> str;
    property refreshToken -> str;
  }

  # currency details
  type Currency {
    required property symbol -> str {
      constraint exclusive;
    };  # e.g., 'ETH', 'BTC'
    required property name -> str {
      constraint exclusive;
    };  # full name like 'Ethereum', 'Bitcoin'
    required property iconImg -> str;     # image url
    multi link exchangeRates := .<baseCurrency[IS ExchangeRate];
  }

  # crypto-to-crypto exchange rates
  type ExchangeRate {
    required property ratio -> float64;  # e.g., 1 ETH = 0.05 BTC
    required baseCurrency: Currency;  # e.g., ETH
    required destinationCurrency: Currency;    # e.g., BTC
    required property updatedAt -> datetime; # when rate was updated

  }

 scalar type WalletType extending enum <EOA, Contract>;

  # transactions n wallets stay same but link to currency
  type Wallet {
    required property address -> str {
        constraint exclusive;
    };
    required property type -> WalletType;
    required property balance -> float64 {
        default := 0.0;
    };

    required currency: Currency;  # currency type of wallet
  }

  type Transaction {
    required property from_address -> str;
    required property to_address -> str;
    required property hash -> str {
        constraint exclusive;  
    };
    required property value -> str;
    required property input -> str;
    required property transaction_index -> int64;
    required property gas -> int64;
    required property gas_used -> int64;
    required property gas_price -> int64;
    required property transaction_fee -> int64;
    required property block_number -> int64;
    required property block_hash -> str;
    required property block_timestamp -> int64;

    # Add links to source and destination wallets
    required link sourceWallet := (
        SELECT Wallet 
        FILTER .address = .from_address
        LIMIT 1
    );
    required link destinationWallet := (
        SELECT Wallet 
        FILTER .address = .to_address
        LIMIT 1
    );

    index on (.hash);
    index on (.from_address);
    index on (.to_address);
    index on (.block_number);
 }
}
