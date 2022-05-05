async def save_entry_to_db(id: str) -> None:
   return f'saved to db: {id}'

async def run(context, input):
   async for id in input:
      yield await save_entry_to_db(id)

