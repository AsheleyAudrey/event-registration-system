from pydantic import BaseModel, EmailStr
from datetime import date
from uuid import UUID


class EventCreate(BaseModel):
    name: str
    date: str
    time: str
    location: str
    description: str
    image_url: str = None

class EventRegistration(BaseModel):
    event_id: str
    name: str
    email: EmailStr
    phone: str
    registration_date: str = date.today().isoformat() 
    
    