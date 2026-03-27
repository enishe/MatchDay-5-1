classDiagram

%% ── ENUMERATIONS ──
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

class CancellationStatus {
  <<enumeration>>
  FREE
  PENALTY_40
  AUTO_CANCELLED
}

class UserRole {
  <<enumeration>>
  ORGANIZER
  PARTICIPANT
  ADMIN
}

%% ── MODELS ──
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
  +payAmount(float amount) void
}

class Field {
  -int fieldId
  -string name
  -TerrainType terrain
  -float pricePerHour
  -string location
  +isAvailable(datetime start) bool
}

class ShoesInventory {
  -int itemId
  -int size
  -float rentPrice
  -bool available
  +rent() bool
  +returnItem() void
}

%% ── INTERFACES ──
class IRepository {
  <<interface>>
  +GetAll() List
  +GetById(int id) Object
  +Add(entity) void
  +Save() void
}

class IUserRepository {
  <<interface>>
  +FindByEmail(string email) User
  +Save(user) void
  +GetAll() List
}

%% ── REPOSITORIES ──
class FileRepository {
  -string filePath
  +GetAll() List
  +GetById(int id) Match
  +Add(entity) void
  +Save() void
}

class UserRepository {
  -string filePath
  +FindByEmail(string email) User
  +Save(user) void
  +GetAll() List
}

%% ── SERVICES ──
class MatchService {
  -IRepository repo
  +processSmartSplit(int matchId) void
  +handleCancellation(int matchId) void
  +addPlayerToMatch(int matchId, Participant p) void
}

class PaymentService {
  -IRepository repo
  +processPayment(int userId, float amount) bool
  +refund(int userId, float amount) bool
  +getStatus(int userId) PaymentStatus
}

class NotificationService {
  +sendEmail(string to, string subject, string body) void
  +sendConfirmation(int matchId, int userId) void
  +sendCancellation(int matchId) void
  +sendReminder(int matchId) void
}

class SchedulerService {
  -int intervalMs
  +checkDeadlines() void
  +autoCancelMatch(int matchId) void
  +run() void
  +stop() void
}

%% ── CONTROLLERS ──
class MatchController {
  -MatchService matchService
  +createMatch(CreateMatchDTO dto) Match
  +getMatches() List
  +joinMatch(int matchId, int userId) void
  +cancelMatch(int matchId) void
}

class PaymentController {
  -PaymentService paymentService
  +pay(int userId, PaymentDTO dto) bool
  +refund(int userId) bool
  +getReceipt(int userId) PaymentDTO
}

class FieldController {
  -IRepository fieldRepo
  +getFields() List
  +filterByTerrain(TerrainType t) List
  +getAvailability(int fieldId) bool
}

class AuthController {
  -IUserRepository userRepo
  +register(string email, string password) void
  +login(string email, string password) string
  +logout(string token) void
}

%% ── DTOs & UTILITIES ──
class CreateMatchDTO {
  +int fieldId
  +datetime startTime
  +TerrainType terrain
  +float totalCost
}

class PaymentDTO {
  +int userId
  +int matchId
  +float amount
  +bool shoeRent
}

class SmartSplitCalculator {
  +calculate(float total, int players) float
  +applyPenalty(float amount, float rate) float
}

class CancellationPolicyValidator {
  +canCancelFree(datetime matchStart) bool
  +getPenaltyRate(datetime matchStart) float
}

%% ── RELATIONS ──
Match "1" o-- "12" Participant : aggregation
Match --> TerrainType : uses
Participant --> PaymentStatus : has
Match --> CancellationStatus : tracks
Field --> TerrainType : uses

IRepository <|.. FileRepository : realizes
IUserRepository <|.. UserRepository : realizes

MatchService --> IRepository : injects (DIP)
PaymentService --> IRepository : injects (DIP)
FieldController --> IRepository : injects (DIP)
AuthController --> IUserRepository : injects (DIP)

MatchController --> MatchService : depends on
PaymentController --> PaymentService : depends on
MatchService --> SmartSplitCalculator : uses
MatchService --> CancellationPolicyValidator : uses
MatchService --> NotificationService : uses
SchedulerService --> MatchService : triggers