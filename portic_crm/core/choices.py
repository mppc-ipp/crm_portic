from django.db import models


class TipoHistorico(models.TextChoices):
    TEXTO_LIVRE = "TEXTO_LIVRE", "Texto livre"
    EVENTO = "EVENTO", "Evento"
    PEDIDO_PORTIC = "PEDIDO_PORTIC", "Pedido Portic"
    PEDIDO_EMPRESA = "PEDIDO_EMPRESA", "Pedido Empresa"
    OUTRO = "OUTRO", "Outro"
