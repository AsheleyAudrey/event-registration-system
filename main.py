from fastapi import FastAPI, HTTPException
import boto3
from schemes import EventCreate, EventRegistration
from uuid import uuid4

from dotenv import load_dotenv


load_dotenv()



app = FastAPI()

@app.get("/")
async def read_root():
    return {"Hello": "World"}



# Tests
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')  
table = dynamodb.Table("event")
table_registrations = dynamodb.Table("registration")


ddb = boto3.resource("dynamodb", region_name="us-east-1") # your actual client 

@app.get("/events")
async def get_events():
    response = table.scan()
    print(response)
    events = response.get('Items', [])
    return {"events": events}

@app.post("/events")
async def create_event(event: EventCreate):
    db_event = event.model_dump()
    db_event['id'] = str(uuid4())
    table.put_item(Item=db_event)
    return {"message": "Event created successfully", "event": db_event}

@app.get("/events/{event_id}")
async def get_event(event_id: str):
    response = table.get_item(Key={'id': event_id})
    event = response.get('Item')
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"event": event}

@app.delete("/events/{event_id}")
async def delete_event(event_id: str):
    response = table.delete_item(Key={'id': event_id})
    if response.get('ResponseMetadata', {}).get('HTTPStatusCode') != 200:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully", "event_id": event_id}

@app.get("/registrations")
async def get_all_registrations():
    response = table_registrations.scan()
    registrations = response.get('Items', [])
    return {"registrations": registrations}


@app.post("/register")
async def register(registration: EventRegistration):
    db_registration = registration.model_dump()
    db_registration['id'] = str(uuid4())
    event_id = db_registration.get('event_id')
    # Check if the event exists
    response = table.get_item(Key={'id': str(event_id)})
    if 'Item' not in response:
        raise HTTPException(status_code=404, detail="Event not found")
    table_registrations.put_item(Item=db_registration)
    return {"message": "Registration successful"}


@app.get("/registrations/{email}")
async def get_registrations(email: str):
    response = table_registrations.scan(
        FilterExpression="email = :email",
        ExpressionAttributeValues={":email": email}
    )
    registrations = response.get('Items', [])
    if not registrations:
        raise HTTPException(status_code=404, detail="No registrations found for this email")    
    return {"registrations": registrations}


@app.get("/registration/{id}")
async def get_registration(id: str):
    response = table_registrations.get_item(Key={'id': id})
    registration = response.get('Item')
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"registration": registration}



@app.delete("/registration/{id}")
async def delete_registration(id: str):
    response = table_registrations.delete_item(Key={'id': id})
    if response.get('ResponseMetadata', {}).get('HTTPStatusCode') != 200:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"message": "Registration deleted successfully", "registration_id": id}
    