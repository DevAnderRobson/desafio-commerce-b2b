<?php

namespace App\Messaging\Consumer;

use App\Messaging\Exceptions\InvalidIncomingEventException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Validator;
use JsonException;

/**
 * Converte o corpo bruto de uma mensagem em um `IncomingEvent`, validando o envelope.
 */
final class IncomingEventParser
{
    /**
     * @throws InvalidIncomingEventException
     */
    public function parse(string $body): IncomingEvent
    {
        try {
            $payload = json_decode($body, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw InvalidIncomingEventException::malformedJson();
        }

        if (! is_array($payload)) {
            throw InvalidIncomingEventException::malformedJson();
        }

        $validator = Validator::make($payload, [
            'id' => ['required', 'string', 'max:100'],
            'event' => ['required', 'string', 'max:150'],
            'version' => ['required', 'integer', 'min:1'],
            'occurred_at' => ['required', 'string', 'date'],
            'data' => ['present', 'array'],
        ]);

        if ($validator->fails()) {
            throw InvalidIncomingEventException::invalidEnvelope(array_values($validator->errors()->all()));
        }

        return new IncomingEvent(
            id: $payload['id'],
            event: $payload['event'],
            version: $payload['version'],
            occurredAt: CarbonImmutable::parse($payload['occurred_at']),
            data: $payload['data'],
        );
    }
}
