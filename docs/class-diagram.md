 classDiagram
    class Player {
        +int id
        +string name
        +float skillLevel
        +string position
    }

    class Match {
        +int matchId
        +DateTime date
        +List~Player~ teamA
        +List~Player~ teamB
        +string finalScore
    }

    class IMatchRepository {
        <<interface>>
        +getAll() List
        +save(Match m) bool
        +delete(int id) bool
    }

    class FileMatchRepository {
        -string filePath
        +loadFromCSV()
        +saveToCSV()
    }

    class MatchService {
        -IMatchRepository repo
        +generateSmartSplit(List players)
        +calculateWinProbability()
    }

    class MatchController {
        -MatchService service
        +getMatches()
        +createMatch()
    }

    class DBException {
        +string message
        +logError()
    }

    IMatchRepository <|.. FileMatchRepository : implements
    MatchService --> IMatchRepository : uses (DIP)
    MatchController --> MatchService : delegates to
    MatchService ..> Match : orchestrates
    Match "1" o-- "*" Player : aggregates
    FileMatchRepository ..> DBException : handles