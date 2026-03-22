 classDiagram
    class TerrainType {
        <<enumeration>>
        ARTIFICIAL_GRASS
        INDOOR_HALL
    }

    class PaymentStatus {
        <<enumeration>>
        PENDING
        PAID
        REFUNDED
    }

    class Match {
        -int matchId
        -TerrainType terrain
        -float totalCost
        -datetime startTime
        -int playersJoined
        +getAmountPerPerson() float
        +canCancelWithoutPenalty() bool
    }

    class Participant {
        -int userId
        -string name
        -bool needsShoes
        -PaymentStatus status
        +payAmount(float amount)
    }

    class IRepository {
        <<interface>>
        +GetAll() List
        +GetById(id) Match
        +Add(entity) void
        +Save() void
    }

    class FileRepository {
        -string filePath
        +Save() void
    }

    class MatchService {
        -IRepository repo
        +processSmartSplit(matchId)
        +handleCancellation(matchId)
        +addPlayerToMatch(matchId, participant)
    }

    IRepository <|.. FileRepository : Realizes
    MatchService --> IRepository : Injects (DIP)
    Match "1" o-- "12" Participant : Aggregation
    Match --> TerrainType : Uses
    Participant --> PaymentStatus : Has