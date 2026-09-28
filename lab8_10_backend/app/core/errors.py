from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError


def translate_integrity_error(error: IntegrityError) -> HTTPException:
    message = str(error.orig)
    if "unique" in message.lower() or "duplicate key" in message.lower():
        return HTTPException(status_code=409, detail="A record with these values already exists")
    if "foreign key" in message.lower():
        return HTTPException(status_code=400, detail="A referenced record does not exist")
    return HTTPException(status_code=400, detail="The requested change violates a data constraint")
