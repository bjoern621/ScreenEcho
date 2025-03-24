package assert

import "log"

func IsNil(err error, v ...any) {
	if err != nil {
		log.Panicf("[ASSERT] %v was not nil. %v", err, v)
	}
}

func Never(v ...any) {
	log.Panicf("[ASSERT] %v", v)
}

func Assert(condition bool, v ...any) {
	if !condition {
		log.Panicf("[ASSERT] %v", v)
	}
}

func IsNotNil(obj any, v ...any) {
	if obj == nil {
		log.Panicf("[ASSERT] %v was nil. %v", obj, v)
	}
}
