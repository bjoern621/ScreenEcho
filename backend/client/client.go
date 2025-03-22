package user

import "github.com/google/uuid"

type User struct {
	UUID        uuid.UUID
	DisplayName string
}
